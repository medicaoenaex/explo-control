/**
 * Serviço de estoque — único lugar que cria movimentações.
 *
 * Regras centrais:
 * - Saldo = soma das movimentações VALIDADAS do vínculo produto×unidade (e lote, se houver).
 * - Toda baixa trava o vínculo (SELECT ... FOR UPDATE) antes de conferir o saldo, para que
 *   dois lançamentos simultâneos não deixem o saldo negativo.
 * - Transferência: débito na origem ao ENVIAR; crédito no destino só na CONFERÊNCIA.
 *   Entre os dois, a quantidade é "em trânsito" e conta uma única vez no total do grupo.
 */
import { Prisma, type PrismaClient, type StatusTransferencia, type TipoMovimento } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { RegraNegocioError } from "@/lib/erros";
import { lancamentoSchema, recebimentoSchema, transferenciaSchema } from "@/lib/validacao";
import { exigir, type Ator } from "./permissoes";

type Tx = Prisma.TransactionClient;
const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);
const ZERO = D(0);

// ───────────────────────── utilitários internos ─────────────────────────

async function auditar(tx: Tx, ator: Ator, acao: string, entidade: string, entidadeId: string, dados?: unknown) {
  await tx.auditoria.create({
    data: { usuarioId: ator.id, acao, entidade, entidadeId, dados: (dados ?? undefined) as Prisma.InputJsonValue },
  });
}

async function travarVinculo(tx: Tx, produtoUnidadeId: string) {
  await tx.$queryRaw`SELECT id FROM "ProdutoUnidade" WHERE id = ${produtoUnidadeId} FOR UPDATE`;
}

/** Busca o vínculo produto×unidade exigindo produto e vínculo ativos. */
async function vinculoAtivo(tx: Tx, produtoId: string, unidadeId: string, papel: "origem" | "destino" | "unidade") {
  const v = await tx.produtoUnidade.findUnique({
    where: { produtoId_unidadeId: { produtoId, unidadeId } },
    include: { produto: true, unidade: true },
  });
  if (!v) {
    const msg =
      papel === "destino"
        ? "O produto não está cadastrado na unidade de destino. Solicite o vínculo autorizado antes de continuar."
        : "O produto não está cadastrado nesta unidade.";
    throw new RegraNegocioError(msg, papel === "destino" ? "SEM_VINCULO_DESTINO" : "SEM_VINCULO");
  }
  if (v.produto.situacao !== "ATIVO") throw new RegraNegocioError("O produto está inativo no catálogo central.", "PRODUTO_INATIVO");
  if (v.situacao !== "ATIVO")
    throw new RegraNegocioError(`O produto está inativo na unidade ${v.unidade.nome}.`, "VINCULO_INATIVO");
  if (v.unidade.situacao !== "ATIVO") throw new RegraNegocioError(`A unidade ${v.unidade.nome} está inativa.`, "UNIDADE_INATIVA");
  return v;
}

async function resolverLote(tx: Tx, produto: { id: string; controlaLote: boolean }, numero: string | undefined, criar: boolean) {
  if (!produto.controlaLote) {
    if (numero) throw new RegraNegocioError("Este produto não tem controle de lote.", "LOTE_NAO_APLICAVEL");
    return null;
  }
  if (!numero) throw new RegraNegocioError("Informe o lote: este produto exige controle de lote.", "LOTE_OBRIGATORIO");
  const existente = await tx.lote.findUnique({ where: { produtoId_numero: { produtoId: produto.id, numero } } });
  if (existente) return existente;
  if (!criar) throw new RegraNegocioError(`Lote ${numero} não encontrado para este produto.`, "LOTE_INEXISTENTE");
  return tx.lote.create({ data: { produtoId: produto.id, numero } });
}

export async function saldoDisponivel(tx: Tx | PrismaClient, produtoUnidadeId: string, loteId?: string | null) {
  const r = await tx.movimento.aggregate({
    _sum: { quantidade: true },
    where: { produtoUnidadeId, status: "VALIDADO", ...(loteId ? { loteId } : {}) },
  });
  return r._sum.quantidade ?? ZERO;
}

async function garantirSaldo(tx: Tx, produtoUnidadeId: string, loteId: string | null, necessario: Prisma.Decimal) {
  const saldo = await saldoDisponivel(tx, produtoUnidadeId, loteId);
  if (saldo.lt(necessario)) {
    throw new RegraNegocioError(
      `Saldo insuficiente: disponível ${saldo.toString()}, solicitado ${necessario.toString()}.`,
      "SALDO_INSUFICIENTE",
    );
  }
}

// ───────────────────────── entradas e consumo ─────────────────────────

/** Registra uma ENTRADA ou CONSUMO como PENDENTE (não altera saldo até a validação). */
export async function registrarLancamento(entrada: z.input<typeof lancamentoSchema>, ator: Ator, db: PrismaClient = prisma) {
  const dados = lancamentoSchema.parse(entrada);
  exigir(ator, "lancamento.registrar", dados.unidadeId);

  return db.$transaction(async (tx) => {
    const v = await vinculoAtivo(tx, dados.produtoId, dados.unidadeId, "unidade");
    const lote = await resolverLote(tx, v.produto, dados.loteNumero || undefined, dados.tipo === "ENTRADA");
    const qtd = D(dados.quantidade);

    if (dados.tipo === "CONSUMO") {
      // aviso antecipado; a checagem definitiva acontece na validação, com trava
      await garantirSaldo(tx, v.id, lote?.id ?? null, qtd);
    }
    if (dados.tipo === "ENTRADA" && dados.documento) {
      const dup = await tx.movimento.findFirst({
        where: { tipo: "ENTRADA", documento: dados.documento, produtoUnidadeId: v.id, loteId: lote?.id ?? null, status: { in: ["PENDENTE", "VALIDADO"] } },
      });
      if (dup) throw new RegraNegocioError("Já existe uma entrada deste produto com o mesmo documento.", "DUPLICIDADE");
    }

    const mov = await tx.movimento.create({
      data: {
        tipo: dados.tipo,
        status: "PENDENTE",
        produtoUnidadeId: v.id,
        loteId: lote?.id,
        quantidade: dados.tipo === "CONSUMO" ? qtd.neg() : qtd,
        dataMovimento: dados.dataMovimento,
        documento: dados.documento,
        fornecedor: dados.fornecedor,
        observacoes: dados.observacoes,
        criadoPorId: ator.id,
      },
    });
    await auditar(tx, ator, `${dados.tipo}_REGISTRADA`, "Movimento", mov.id, { quantidade: qtd.toString() });
    return mov;
  });
}

/** Valida um lançamento pendente; a partir daqui ele compõe o saldo. */
export async function validarLancamento(movimentoId: string, ator: Ator, db: PrismaClient = prisma) {
  return db.$transaction(async (tx) => {
    const mov = await tx.movimento.findUniqueOrThrow({ where: { id: movimentoId }, include: { produtoUnidade: true } });
    exigir(ator, "lancamento.validar", mov.produtoUnidade.unidadeId);
    if (mov.status !== "PENDENTE") throw new RegraNegocioError("Este lançamento não está pendente.", "STATUS_INVALIDO");
    if (mov.criadoPorId === ator.id && ator.perfil !== "ADMIN")
      throw new RegraNegocioError("O lançamento deve ser validado por outra pessoa.", "SEGREGACAO");

    await travarVinculo(tx, mov.produtoUnidadeId);
    if (mov.quantidade.isNeg()) await garantirSaldo(tx, mov.produtoUnidadeId, mov.loteId, mov.quantidade.abs());

    const ok = await tx.movimento.update({
      where: { id: mov.id },
      data: { status: "VALIDADO", validadoEm: new Date(), validadoPorId: ator.id },
    });
    await auditar(tx, ator, "LANCAMENTO_VALIDADO", "Movimento", mov.id);
    return ok;
  });
}

// ───────────────────────── transferências ─────────────────────────

async function proximoCodigo(tx: Tx, data: Date) {
  const ano = data.getFullYear();
  const n = await tx.transferencia.count({ where: { codigo: { startsWith: `TRF-${ano}-` } } });
  return `TRF-${ano}-${String(n + 1).padStart(6, "0")}`;
}

export async function criarTransferencia(entrada: z.input<typeof transferenciaSchema>, ator: Ator, db: PrismaClient = prisma) {
  const dados = transferenciaSchema.parse(entrada);
  exigir(ator, "transferencia.criar", dados.origemId);

  return db.$transaction(async (tx) => {
    const [origem, destino] = await Promise.all([
      tx.unidade.findUniqueOrThrow({ where: { id: dados.origemId }, include: { empresa: true } }),
      tx.unidade.findUniqueOrThrow({ where: { id: dados.destinoId }, include: { empresa: true } }),
    ]);
    const itens = [];
    for (const it of dados.itens) {
      const v = await vinculoAtivo(tx, it.produtoId, origem.id, "origem");
      const lote = await resolverLote(tx, v.produto, it.loteNumero || undefined, false);
      itens.push({ produtoId: it.produtoId, loteId: lote?.id, quantidadeEnviada: D(it.quantidade) });
    }
    const trf = await tx.transferencia.create({
      data: {
        codigo: await proximoCodigo(tx, dados.dataTransferencia),
        status: "RASCUNHO",
        origemId: origem.id,
        destinoId: destino.id,
        cnpjOrigem: origem.empresa.cnpj,
        cnpjDestino: destino.empresa.cnpj,
        documento: dados.documento,
        observacoes: dados.observacoes,
        dataTransferencia: dados.dataTransferencia,
        criadoPorId: ator.id,
        itens: { create: itens },
      },
      include: { itens: true },
    });
    await auditar(tx, ator, "TRANSFERENCIA_CRIADA", "Transferencia", trf.id, { codigo: trf.codigo });
    return trf;
  });
}

async function carregarTrf(tx: Tx, id: string) {
  // trava a transferência para evitar dois envios/recebimentos simultâneos
  await tx.$queryRaw`SELECT id FROM "Transferencia" WHERE id = ${id} FOR UPDATE`;
  return tx.transferencia.findUniqueOrThrow({
    where: { id },
    include: { itens: { include: { produto: true } }, origem: { include: { empresa: true } }, destino: { include: { empresa: true } } },
  });
}

function exigirStatus(atual: StatusTransferencia, permitidos: StatusTransferencia[]) {
  if (!permitidos.includes(atual))
    throw new RegraNegocioError(`Ação não permitida para transferência com status ${atual}.`, "STATUS_INVALIDO");
}

export async function solicitarEnvio(id: string, ator: Ator, db: PrismaClient = prisma) {
  return db.$transaction(async (tx) => {
    const trf = await carregarTrf(tx, id);
    exigir(ator, "transferencia.criar", trf.origemId);
    exigirStatus(trf.status, ["RASCUNHO"]);
    await auditar(tx, ator, "TRANSFERENCIA_ENVIO_SOLICITADO", "Transferencia", id);
    return tx.transferencia.update({ where: { id }, data: { status: "PENDENTE_ENVIO" } });
  });
}

/** Envia: confere vínculo no destino e saldo na origem, debita a origem e põe em trânsito. */
export async function enviarTransferencia(id: string, ator: Ator, db: PrismaClient = prisma) {
  return db.$transaction(async (tx) => {
    const trf = await carregarTrf(tx, id);
    exigir(ator, "transferencia.enviar", trf.origemId);
    exigirStatus(trf.status, ["RASCUNHO", "PENDENTE_ENVIO"]);

    // soma por produto/lote (a mesma transferência pode repetir o produto em linhas diferentes)
    const necessidade = new Map<string, { vinculoId: string; loteId: string | null; qtd: Prisma.Decimal }>();
    for (const it of trf.itens) {
      await vinculoAtivo(tx, it.produtoId, trf.destinoId, "destino");
      const vo = await vinculoAtivo(tx, it.produtoId, trf.origemId, "origem");
      const chave = `${vo.id}:${it.loteId ?? ""}`;
      const atual = necessidade.get(chave);
      necessidade.set(chave, { vinculoId: vo.id, loteId: it.loteId, qtd: (atual?.qtd ?? ZERO).add(it.quantidadeEnviada) });
    }
    // trava em ordem determinística para evitar deadlock
    for (const vinculoId of [...new Set([...necessidade.values()].map((n) => n.vinculoId))].sort()) await travarVinculo(tx, vinculoId);
    for (const n of necessidade.values()) await garantirSaldo(tx, n.vinculoId, n.loteId, n.qtd);

    const agora = new Date();
    for (const it of trf.itens) {
      const vo = await tx.produtoUnidade.findUniqueOrThrow({ where: { produtoId_unidadeId: { produtoId: it.produtoId, unidadeId: trf.origemId } } });
      await tx.movimento.create({
        data: {
          tipo: "TRANSFERENCIA_SAIDA",
          status: "VALIDADO",
          produtoUnidadeId: vo.id,
          loteId: it.loteId,
          quantidade: it.quantidadeEnviada.neg(),
          dataMovimento: trf.dataTransferencia,
          documento: trf.documento ?? trf.codigo,
          transferenciaItemId: it.id,
          chaveIdempotencia: `TRF:${it.id}:SAIDA`,
          criadoPorId: ator.id,
          validadoPorId: ator.id,
          validadoEm: agora,
          demonstracao: trf.demonstracao,
        },
      });
    }
    await auditar(tx, ator, "TRANSFERENCIA_ENVIADA", "Transferencia", id, { codigo: trf.codigo });
    return tx.transferencia.update({
      where: { id },
      data: {
        status: "EM_TRANSITO",
        enviadoPorId: ator.id,
        enviadoEm: agora,
        // cópia documental dos CNPJs no momento do envio
        cnpjOrigem: trf.origem.empresa.cnpj,
        cnpjDestino: trf.destino.empresa.cnpj,
      },
    });
  });
}

/** Destino informa que o material chegou e está em conferência. */
export async function registrarChegada(id: string, ator: Ator, db: PrismaClient = prisma) {
  return db.$transaction(async (tx) => {
    const trf = await carregarTrf(tx, id);
    exigir(ator, "transferencia.receber", trf.destinoId);
    exigirStatus(trf.status, ["EM_TRANSITO"]);
    await auditar(tx, ator, "TRANSFERENCIA_CHEGADA", "Transferencia", id);
    return tx.transferencia.update({ where: { id }, data: { status: "AGUARDANDO_CONFERENCIA" } });
  });
}

/**
 * Confirma o recebimento com as quantidades conferidas.
 * Credita no destino o recebido (limitado ao enviado). Qualquer diferença deixa a
 * transferência DIVERGENTE até análise: a falta segue contada como "em trânsito" e a sobra
 * só entra no estoque depois de aprovada — assim o total do grupo não muda sem aprovação.
 */
export async function confirmarRecebimento(entrada: z.input<typeof recebimentoSchema>, ator: Ator, db: PrismaClient = prisma) {
  const dados = recebimentoSchema.parse(entrada);
  return db.$transaction(async (tx) => {
    const trf = await carregarTrf(tx, dados.transferenciaId);
    exigir(ator, "transferencia.receber", trf.destinoId);
    exigirStatus(trf.status, ["EM_TRANSITO", "AGUARDANDO_CONFERENCIA"]);
    if (trf.enviadoPorId === ator.id) throw new RegraNegocioError("Quem enviou não pode confirmar o recebimento.", "SEGREGACAO");

    const conferidos = new Map(dados.itens.map((i) => [i.itemId, D(i.quantidadeRecebida)]));
    if (trf.itens.some((it) => !conferidos.has(it.id)))
      throw new RegraNegocioError("Informe a quantidade conferida de todos os itens.", "CONFERENCIA_INCOMPLETA");

    let divergente = false;
    const agora = new Date();
    for (const it of trf.itens) {
      const recebido = conferidos.get(it.id)!;
      const vd = await vinculoAtivo(tx, it.produtoId, trf.destinoId, "destino");
      const creditar = Prisma.Decimal.min(recebido, it.quantidadeEnviada);
      if (!recebido.eq(it.quantidadeEnviada)) divergente = true;
      await tx.transferenciaItem.update({ where: { id: it.id }, data: { quantidadeRecebida: recebido } });
      if (creditar.gt(0)) {
        await tx.movimento.create({
          data: {
            tipo: "TRANSFERENCIA_ENTRADA",
            status: "VALIDADO",
            produtoUnidadeId: vd.id,
            loteId: it.loteId,
            quantidade: creditar,
            dataMovimento: agora,
            documento: trf.documento ?? trf.codigo,
            transferenciaItemId: it.id,
            chaveIdempotencia: `TRF:${it.id}:ENTRADA`,
            criadoPorId: ator.id,
            validadoPorId: ator.id,
            validadoEm: agora,
            demonstracao: trf.demonstracao,
          },
        });
      }
    }
    const status: StatusTransferencia = divergente ? "DIVERGENTE" : "RECEBIDA";
    await auditar(tx, ator, divergente ? "TRANSFERENCIA_DIVERGENTE" : "TRANSFERENCIA_RECEBIDA", "Transferencia", trf.id);
    return tx.transferencia.update({
      where: { id: trf.id },
      data: { status, recebidoPorId: ator.id, recebidoEm: agora },
    });
  });
}

/** Análise formal de divergência de um item. Quando todos os itens estão resolvidos, a transferência fica RECEBIDA. */
export async function resolverDivergencia(
  itemId: string,
  resolucao: "AJUSTE_APROVADO" | "RETORNO_ORIGEM",
  justificativa: string,
  ator: Ator,
  db: PrismaClient = prisma,
) {
  if (justificativa.trim().length < 10) throw new RegraNegocioError("Descreva a justificativa (mínimo 10 caracteres).", "JUSTIFICATIVA");
  return db.$transaction(async (tx) => {
    const item0 = await tx.transferenciaItem.findUniqueOrThrow({ where: { id: itemId } });
    const trf = await carregarTrf(tx, item0.transferenciaId);
    const item = trf.itens.find((i) => i.id === itemId)!;
    exigir(ator, "divergencia.resolver", trf.destinoId);
    exigirStatus(trf.status, ["DIVERGENTE"]);
    if (item.resolucao) throw new RegraNegocioError("Esta divergência já foi analisada.", "JA_RESOLVIDA");
    const diff = item.quantidadeRecebida!.sub(item.quantidadeEnviada); // >0 sobra, <0 falta
    if (diff.isZero()) throw new RegraNegocioError("Este item não possui divergência.", "SEM_DIVERGENCIA");
    if (diff.gt(0) && resolucao === "RETORNO_ORIGEM")
      throw new RegraNegocioError("Sobra não pode ser resolvida como retorno à origem.", "RESOLUCAO_INVALIDA");

    const agora = new Date();
    let tipo: TipoMovimento | null = null;
    let unidadeId = trf.destinoId;
    if (diff.gt(0)) tipo = "TRANSFERENCIA_SOBRA";
    else if (resolucao === "RETORNO_ORIGEM") {
      tipo = "TRANSFERENCIA_RETORNO";
      unidadeId = trf.origemId;
    }
    if (tipo) {
      const v = await tx.produtoUnidade.findUniqueOrThrow({ where: { produtoId_unidadeId: { produtoId: item.produtoId, unidadeId } } });
      await tx.movimento.create({
        data: {
          tipo,
          status: "VALIDADO",
          produtoUnidadeId: v.id,
          loteId: item.loteId,
          quantidade: diff.abs(),
          dataMovimento: agora,
          documento: trf.documento ?? trf.codigo,
          observacoes: justificativa,
          transferenciaItemId: item.id,
          chaveIdempotencia: `TRF:${item.id}:RESOLUCAO`,
          criadoPorId: ator.id,
          validadoPorId: ator.id,
          validadoEm: agora,
          demonstracao: trf.demonstracao,
        },
      });
    }
    await tx.transferenciaItem.update({
      where: { id: item.id },
      data: { resolucao, justificativa, aprovadoPorId: ator.id, aprovadoEm: agora },
    });
    await auditar(tx, ator, "DIVERGENCIA_RESOLVIDA", "TransferenciaItem", item.id, { resolucao, diferenca: diff.toString() });

    const pendentes = trf.itens.filter(
      (i) => i.id !== item.id && !i.resolucao && i.quantidadeRecebida && !i.quantidadeRecebida.eq(i.quantidadeEnviada),
    );
    if (pendentes.length === 0) await tx.transferencia.update({ where: { id: trf.id }, data: { status: "RECEBIDA" } });
  });
}

export async function cancelarTransferencia(id: string, ator: Ator, db: PrismaClient = prisma) {
  return db.$transaction(async (tx) => {
    const trf = await carregarTrf(tx, id);
    exigir(ator, "transferencia.criar", trf.origemId);
    exigirStatus(trf.status, ["RASCUNHO", "PENDENTE_ENVIO"]); // depois de enviada, só por divergência/retorno
    await auditar(tx, ator, "TRANSFERENCIA_CANCELADA", "Transferencia", id);
    return tx.transferencia.update({ where: { id }, data: { status: "CANCELADA", canceladoEm: new Date() } });
  });
}

// ───────────────────────── consultas de saldo ─────────────────────────

export type LinhaSaldo = {
  produtoId: string;
  codigo: string;
  descricao: string;
  categoria: string;
  unidadeMedida: string;
  unidadeId: string;
  unidade: string;
  codigoLocal: string;
  situacaoVinculo: string;
  disponivel: Prisma.Decimal;
};

/** Saldo disponível por vínculo produto×unidade (inclui vínculos com saldo zero). */
export async function saldosPorUnidade(filtro: { unidadeId?: string; empresaId?: string; categoriaId?: string } = {}, db: PrismaClient = prisma) {
  const vinculos = await db.produtoUnidade.findMany({
    where: {
      unidadeId: filtro.unidadeId,
      unidade: filtro.empresaId ? { empresaId: filtro.empresaId } : undefined,
      produto: filtro.categoriaId ? { categoriaId: filtro.categoriaId } : undefined,
    },
    include: { produto: { include: { categoria: true, unidadeMedida: true } }, unidade: true },
    orderBy: [{ unidade: { nome: "asc" } }, { produto: { codigo: "asc" } }],
  });
  const somas = await db.movimento.groupBy({
    by: ["produtoUnidadeId"],
    where: { status: "VALIDADO", produtoUnidadeId: { in: vinculos.map((v) => v.id) } },
    _sum: { quantidade: true },
  });
  const mapa = new Map(somas.map((s) => [s.produtoUnidadeId, s._sum.quantidade ?? ZERO]));
  return vinculos.map<LinhaSaldo>((v) => ({
    produtoId: v.produtoId,
    codigo: v.produto.codigo,
    descricao: v.produto.descricao,
    categoria: v.produto.categoria.nome,
    unidadeMedida: v.produto.unidadeMedida.sigla,
    unidadeId: v.unidadeId,
    unidade: v.unidade.nome,
    codigoLocal: v.codigoLocal,
    situacaoVinculo: v.situacao,
    disponivel: mapa.get(v.id) ?? ZERO,
  }));
}

/**
 * Quantidade em trânsito por produto:
 * - transferências EM_TRANSITO / AGUARDANDO_CONFERENCIA: quantidade enviada inteira;
 * - DIVERGENTE: a falta ainda não analisada (enviado − recebido).
 */
export async function emTransitoPorProduto(db: PrismaClient = prisma) {
  const itens = await db.transferenciaItem.findMany({
    where: { transferencia: { status: { in: ["EM_TRANSITO", "AGUARDANDO_CONFERENCIA", "DIVERGENTE"] } } },
    include: { transferencia: { select: { status: true } } },
  });
  const mapa = new Map<string, Prisma.Decimal>();
  for (const it of itens) {
    let q = ZERO;
    if (it.transferencia.status !== "DIVERGENTE") q = it.quantidadeEnviada;
    else if (!it.resolucao && it.quantidadeRecebida && it.quantidadeRecebida.lt(it.quantidadeEnviada))
      q = it.quantidadeEnviada.sub(it.quantidadeRecebida);
    if (q.gt(0)) mapa.set(it.produtoId, (mapa.get(it.produtoId) ?? ZERO).add(q));
  }
  return mapa;
}

export type LinhaConsolidada = {
  produtoId: string;
  codigo: string;
  descricao: string;
  categoria: string;
  unidadeMedida: string;
  porUnidade: Record<string, Prisma.Decimal>;
  disponivel: Prisma.Decimal;
  emTransito: Prisma.Decimal;
  total: Prisma.Decimal;
};

/** Estoque do grupo: disponível em cada unidade + em trânsito, sem duplicar transferências internas. */
export async function estoqueConsolidado(filtro: { categoriaId?: string } = {}, db: PrismaClient = prisma) {
  const [linhas, transito] = await Promise.all([saldosPorUnidade(filtro, db), emTransitoPorProduto(db)]);
  const mapa = new Map<string, LinhaConsolidada>();
  for (const l of linhas) {
    const c = mapa.get(l.produtoId) ?? {
      produtoId: l.produtoId,
      codigo: l.codigo,
      descricao: l.descricao,
      categoria: l.categoria,
      unidadeMedida: l.unidadeMedida,
      porUnidade: {},
      disponivel: ZERO,
      emTransito: transito.get(l.produtoId) ?? ZERO,
      total: ZERO,
    };
    c.porUnidade[l.unidadeId] = l.disponivel;
    c.disponivel = c.disponivel.add(l.disponivel);
    c.total = c.disponivel.add(c.emTransito);
    mapa.set(l.produtoId, c);
  }
  return [...mapa.values()].sort((a, b) => a.codigo.localeCompare(b.codigo));
}
