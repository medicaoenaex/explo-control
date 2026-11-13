/**
 * Confronto com o Sicoex.
 * No Sicoex as baixas são lançadas só no dia do desmonte; no sistema o consumo é diário.
 * Por isso o saldo Sicoex de uma data é comparado com o saldo diário do sistema na MESMA data;
 * o consumo diário depois dessa data é o que ainda falta lançar no próximo desmonte.
 */
import { Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { RegraNegocioError } from "@/lib/erros";
import { exigir, type Ator } from "./permissoes";

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

export const saldoSicoexSchema = z.object({
  unidadeId: z.string().min(1),
  produtoId: z.string().min(1),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data do lançamento no Sicoex"),
  saldo: z.coerce.number({ invalid_type_error: "Informe o saldo numérico" }).min(0, "O saldo não pode ser negativo").max(1e12),
  observacoes: z.string().trim().max(500).optional(),
});

/** Registra (ou corrige) o saldo Sicoex de um produto num paiol numa data. */
export async function registrarSaldoSicoex(entrada: z.input<typeof saldoSicoexSchema>, ator: Ator, db: PrismaClient = prisma) {
  const d = saldoSicoexSchema.parse(entrada);
  exigir(ator, "lancamento.registrar", d.unidadeId);
  const vinculo = await db.produtoUnidade.findUnique({ where: { produtoId_unidadeId: { produtoId: d.produtoId, unidadeId: d.unidadeId } } });
  if (!vinculo) throw new RegraNegocioError("O produto não está cadastrado neste paiol.", "SEM_VINCULO");
  const data = new Date(`${d.data}T00:00:00Z`);
  return db.$transaction(async (tx) => {
    const chave = { unidadeId_produtoId_data: { unidadeId: d.unidadeId, produtoId: d.produtoId, data } };
    const anterior = await tx.saldoSicoex.findUnique({ where: chave });
    const r = await tx.saldoSicoex.upsert({
      where: chave,
      create: { unidadeId: d.unidadeId, produtoId: d.produtoId, data, saldo: D(d.saldo), observacoes: d.observacoes, criadoPorId: ator.id },
      update: { saldo: D(d.saldo), observacoes: d.observacoes, criadoPorId: ator.id, criadoEm: new Date() },
    });
    await tx.auditoria.create({
      data: {
        usuarioId: ator.id,
        acao: anterior ? "SICOEX_CORRIGIDO" : "SICOEX_REGISTRADO",
        entidade: "SaldoSicoex",
        entidadeId: r.id,
        dados: { saldo: d.saldo, anterior: anterior?.saldo.toString() ?? null, data: d.data },
      },
    });
    return r;
  });
}

/** Fim do dia (horário de Brasília) de uma data @db.Date. */
const fimDoDia = (data: Date) => new Date(`${data.toISOString().slice(0, 10)}T23:59:59.999-03:00`);

async function somar(db: PrismaClient, where: Prisma.MovimentoWhereInput) {
  const r = await db.movimento.aggregate({ _sum: { quantidade: true }, where: { status: "VALIDADO", ...where } });
  return r._sum.quantidade ?? D(0);
}

export type LinhaConfronto = {
  registroId: string;
  unidadeId: string;
  unidade: string;
  produtoId: string;
  produto: string;
  sigla: string;
  data: Date;
  saldoSicoex: Prisma.Decimal;
  saldoDiarioNaData: Prisma.Decimal;
  diferenca: Prisma.Decimal; // Sicoex − diário (0 = confere)
  consumoDepois: Prisma.Decimal; // consumo diário após a data: a lançar no próximo desmonte
  saldoDiarioAtual: Prisma.Decimal;
  observacoes: string | null;
  registradoPor: string;
};

/** Confronta registros Sicoex com o saldo diário. `ultimos` = só o mais recente de cada paiol × produto. */
export async function confrontoSicoex(f: { unidadeIds: string[]; ultimos?: boolean; produtoId?: string }, db: PrismaClient = prisma) {
  const registros = await db.saldoSicoex.findMany({
    where: { unidadeId: { in: f.unidadeIds }, produtoId: f.produtoId },
    include: { unidade: true, produto: { include: { unidadeMedida: true } }, criadoPor: true },
    orderBy: [{ data: "desc" }, { criadoEm: "desc" }],
    take: f.ultimos ? undefined : 200,
  });
  const vistos = new Set<string>();
  const linhas: LinhaConfronto[] = [];
  for (const r of registros) {
    const chave = `${r.unidadeId}:${r.produtoId}`;
    if (f.ultimos && vistos.has(chave)) continue;
    vistos.add(chave);
    const v = await db.produtoUnidade.findUnique({ where: { produtoId_unidadeId: { produtoId: r.produtoId, unidadeId: r.unidadeId } } });
    if (!v) continue;
    const corte = fimDoDia(r.data);
    const [naData, consumoDepois, atual] = [
      await somar(db, { produtoUnidadeId: v.id, dataMovimento: { lte: corte } }),
      await somar(db, { produtoUnidadeId: v.id, tipo: { in: ["CONSUMO", "PRODUCAO_CONSUMO"] }, dataMovimento: { gt: corte } }),
      await somar(db, { produtoUnidadeId: v.id }),
    ];
    linhas.push({
      registroId: r.id,
      unidadeId: r.unidadeId,
      unidade: r.unidade.nome,
      produtoId: r.produtoId,
      produto: `${r.produto.codigo} · ${r.produto.descricao}`,
      sigla: r.produto.unidadeMedida.sigla,
      data: r.data,
      saldoSicoex: r.saldo,
      saldoDiarioNaData: naData,
      diferenca: r.saldo.sub(naData),
      consumoDepois: consumoDepois.abs(),
      saldoDiarioAtual: atual,
      observacoes: r.observacoes,
      registradoPor: r.criadoPor.nome,
    });
  }
  return linhas;
}
