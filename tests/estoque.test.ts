import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  confirmarRecebimento,
  criarTransferencia,
  enviarTransferencia,
  estoqueConsolidado,
  registrarLancamento,
  resolverDivergencia,
  saldosPorUnidade,
  validarLancamento,
} from "@/server/estoque";
import type { Ator } from "@/server/permissoes";

const db = new PrismaClient();
afterAll(() => db.$disconnect());

let seq = 0;
const hoje = new Date("2026-11-13T10:00:00-03:00");

/** Cenário isolado: 2 empresas/unidades, usuários e produtos vinculados conforme pedido. */
async function cenario() {
  const n = ++seq + "-" + Date.now();
  const mkUser = (p: Ator["perfil"], nome: string) =>
    db.usuario.create({ data: { nome, email: `${nome}-${n}@t.local`, perfil: p, senhaHash: "x" } });
  const [admin, gA, oA, gB, oB, consulta] = await Promise.all([
    mkUser("ADMIN", "admin"), mkUser("GESTOR", "ga"), mkUser("OPERADOR", "oa"),
    mkUser("GESTOR", "gb"), mkUser("OPERADOR", "ob"), mkUser("CONSULTA", "c"),
  ]);
  const e1 = await db.empresa.create({ data: { razaoSocial: `E1 ${n}`, nomeFantasia: "E1", cnpj: `1${n}`.replace(/\D/g, "").padEnd(14, "1").slice(0, 14) } });
  const e2 = await db.empresa.create({ data: { razaoSocial: `E2 ${n}`, nomeFantasia: "E2", cnpj: `2${n}`.replace(/\D/g, "").padEnd(14, "2").slice(0, 14) } });
  const A = await db.unidade.create({ data: { nome: `A ${n}`, sigla: `A${n}`, empresaId: e1.id } });
  const B = await db.unidade.create({ data: { nome: `B ${n}`, sigla: `B${n}`, empresaId: e2.id } });
  const cat = await db.categoria.create({ data: { nome: `cat ${n}` } });
  const kg = await db.unidadeMedida.create({ data: { sigla: `kg${n}`, descricao: "kg" } });
  const mkProd = async (codigo: string, vinculos: string[], controlaLote = false) => {
    const p = await db.produto.create({
      data: { codigo: `${codigo}-${n}`, descricao: codigo, categoriaId: cat.id, unidadeMedidaId: kg.id, classificacao: "MATERIAL_GERAL", controlaLote, criadoPorId: admin.id },
    });
    for (const u of vinculos) await db.produtoUnidade.create({ data: { produtoId: p.id, unidadeId: u, codigoLocal: `${codigo}-${u}`, associadoPorId: admin.id } });
    return p;
  };
  const ambos = await mkProd("AMBOS", [A.id, B.id]);
  const soA = await mkProd("SO-A", [A.id]);
  const comLote = await mkProd("LOTE", [A.id, B.id], true);
  const ator = (u: { id: string; perfil: Ator["perfil"] }, unidades: string[]): Ator => ({ id: u.id, perfil: u.perfil, unidadeIds: unidades });
  return {
    A, B, ambos, soA, comLote,
    admin: ator(admin, []), gA: ator(gA, [A.id]), oA: ator(oA, [A.id]), gB: ator(gB, [B.id]), oB: ator(oB, [B.id]), consulta: ator(consulta, [A.id, B.id]),
  };
}
type C = Awaited<ReturnType<typeof cenario>>;

async function saldo(unidadeId: string, produtoId: string) {
  const l = (await saldosPorUnidade({ unidadeId }, db)).find((x) => x.produtoId === produtoId);
  return Number(l?.disponivel ?? 0);
}
async function grupo(produtoId: string) {
  const l = (await estoqueConsolidado({}, db)).find((x) => x.produtoId === produtoId)!;
  return { disponivel: Number(l.disponivel), transito: Number(l.emTransito), total: Number(l.total) };
}
async function entradaValidada(c: C, unidadeId: string, produtoId: string, quantidade: number, loteNumero?: string) {
  const op = unidadeId === c.A.id ? c.oA : c.oB;
  const g = unidadeId === c.A.id ? c.gA : c.gB;
  const m = await registrarLancamento({ tipo: "ENTRADA", unidadeId, produtoId, quantidade, dataMovimento: hoje, loteNumero }, op, db);
  return validarLancamento(m.id, g, db);
}

let c: C;
beforeEach(async () => {
  c = await cenario();
});

describe("Entradas e consumo", () => {
  it("entrada pendente não altera o saldo; só após validação", async () => {
    const m = await registrarLancamento({ tipo: "ENTRADA", unidadeId: c.A.id, produtoId: c.ambos.id, quantidade: 100, dataMovimento: hoje }, c.oA, db);
    expect(await saldo(c.A.id, c.ambos.id)).toBe(0);
    await validarLancamento(m.id, c.gA, db);
    expect(await saldo(c.A.id, c.ambos.id)).toBe(100);
  });

  it("quem lançou não pode validar o próprio lançamento", async () => {
    const m = await registrarLancamento({ tipo: "ENTRADA", unidadeId: c.A.id, produtoId: c.ambos.id, quantidade: 10, dataMovimento: hoje }, c.gA, db);
    await expect(validarLancamento(m.id, c.gA, db)).rejects.toMatchObject({ codigo: "SEGREGACAO" });
  });

  it("bloqueia consumo maior que o saldo", async () => {
    await entradaValidada(c, c.A.id, c.ambos.id, 50);
    await expect(
      registrarLancamento({ tipo: "CONSUMO", unidadeId: c.A.id, produtoId: c.ambos.id, quantidade: 51, dataMovimento: hoje }, c.oA, db),
    ).rejects.toMatchObject({ codigo: "SALDO_INSUFICIENTE" });
  });

  it("duas baixas simultâneas não deixam o saldo negativo", async () => {
    await entradaValidada(c, c.A.id, c.ambos.id, 100);
    const m1 = await registrarLancamento({ tipo: "CONSUMO", unidadeId: c.A.id, produtoId: c.ambos.id, quantidade: 70, dataMovimento: hoje }, c.oA, db);
    const m2 = await registrarLancamento({ tipo: "CONSUMO", unidadeId: c.A.id, produtoId: c.ambos.id, quantidade: 70, dataMovimento: hoje }, c.oA, db);
    const r = await Promise.allSettled([validarLancamento(m1.id, c.gA, db), validarLancamento(m2.id, c.gA, db)]);
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(await saldo(c.A.id, c.ambos.id)).toBe(30);
  });

  it("bloqueia movimentação de produto não vinculado à unidade", async () => {
    await expect(
      registrarLancamento({ tipo: "ENTRADA", unidadeId: c.B.id, produtoId: c.soA.id, quantidade: 1, dataMovimento: hoje }, c.oB, db),
    ).rejects.toMatchObject({ codigo: "SEM_VINCULO" });
  });

  it("produto inativo em uma unidade não recebe movimentação nela, mas segue ativo na outra", async () => {
    await db.produtoUnidade.update({ where: { produtoId_unidadeId: { produtoId: c.ambos.id, unidadeId: c.B.id } }, data: { situacao: "INATIVO" } });
    await expect(
      registrarLancamento({ tipo: "ENTRADA", unidadeId: c.B.id, produtoId: c.ambos.id, quantidade: 1, dataMovimento: hoje }, c.oB, db),
    ).rejects.toMatchObject({ codigo: "VINCULO_INATIVO" });
    await expect(entradaValidada(c, c.A.id, c.ambos.id, 1)).resolves.toBeTruthy();
  });

  it("produto com controle de lote exige lote e controla saldo por lote", async () => {
    await expect(
      registrarLancamento({ tipo: "ENTRADA", unidadeId: c.A.id, produtoId: c.comLote.id, quantidade: 5, dataMovimento: hoje }, c.oA, db),
    ).rejects.toMatchObject({ codigo: "LOTE_OBRIGATORIO" });
    await entradaValidada(c, c.A.id, c.comLote.id, 10, "L1");
    await entradaValidada(c, c.A.id, c.comLote.id, 10, "L2");
    await expect(
      registrarLancamento({ tipo: "CONSUMO", unidadeId: c.A.id, produtoId: c.comLote.id, quantidade: 15, dataMovimento: hoje, loteNumero: "L1" }, c.oA, db),
    ).rejects.toMatchObject({ codigo: "SALDO_INSUFICIENTE" });
  });

  it("impede entrada duplicada com o mesmo documento", async () => {
    const base = { tipo: "ENTRADA" as const, unidadeId: c.A.id, produtoId: c.ambos.id, quantidade: 5, dataMovimento: hoje, documento: "NF-1" };
    await registrarLancamento(base, c.oA, db);
    await expect(registrarLancamento(base, c.oA, db)).rejects.toMatchObject({ codigo: "DUPLICIDADE" });
  });

  it("respeita permissões por perfil e unidade", async () => {
    const e = { tipo: "ENTRADA" as const, unidadeId: c.A.id, produtoId: c.ambos.id, quantidade: 1, dataMovimento: hoje };
    await expect(registrarLancamento(e, c.consulta, db)).rejects.toMatchObject({ codigo: "SEM_PERMISSAO" });
    await expect(registrarLancamento(e, c.oB, db)).rejects.toMatchObject({ codigo: "SEM_PERMISSAO" });
  });
});

describe("Transferências e estoque em trânsito", () => {
  it("envio reduz a origem, aparece em trânsito e não altera o total do grupo; recebimento credita o destino", async () => {
    await entradaValidada(c, c.A.id, c.ambos.id, 100);
    expect(await grupo(c.ambos.id)).toEqual({ disponivel: 100, transito: 0, total: 100 });

    const t = await criarTransferencia({ origemId: c.A.id, destinoId: c.B.id, dataTransferencia: hoje, itens: [{ produtoId: c.ambos.id, quantidade: 40 }] }, c.oA, db);
    expect(await saldo(c.A.id, c.ambos.id)).toBe(100); // rascunho não mexe no saldo

    await enviarTransferencia(t.id, c.gA, db);
    expect(await saldo(c.A.id, c.ambos.id)).toBe(60);
    expect(await saldo(c.B.id, c.ambos.id)).toBe(0); // destino só recebe após conferência
    expect(await grupo(c.ambos.id)).toEqual({ disponivel: 60, transito: 40, total: 100 });

    await confirmarRecebimento({ transferenciaId: t.id, itens: [{ itemId: t.itens[0].id, quantidadeRecebida: 40 }] }, c.oB, db);
    expect(await saldo(c.B.id, c.ambos.id)).toBe(40);
    expect(await grupo(c.ambos.id)).toEqual({ disponivel: 100, transito: 0, total: 100 });
    expect((await db.transferencia.findUniqueOrThrow({ where: { id: t.id } })).status).toBe("RECEBIDA");
  });

  it("não envia produto sem vínculo no destino", async () => {
    await entradaValidada(c, c.A.id, c.soA.id, 10);
    const t = await criarTransferencia({ origemId: c.A.id, destinoId: c.B.id, dataTransferencia: hoje, itens: [{ produtoId: c.soA.id, quantidade: 5 }] }, c.oA, db);
    await expect(enviarTransferencia(t.id, c.gA, db)).rejects.toMatchObject({ codigo: "SEM_VINCULO_DESTINO" });
    expect(await saldo(c.A.id, c.soA.id)).toBe(10);
  });

  it("não envia acima do saldo, somando linhas repetidas do mesmo produto", async () => {
    await entradaValidada(c, c.A.id, c.ambos.id, 50);
    const t = await criarTransferencia(
      { origemId: c.A.id, destinoId: c.B.id, dataTransferencia: hoje, itens: [{ produtoId: c.ambos.id, quantidade: 30 }, { produtoId: c.ambos.id, quantidade: 30 }] },
      c.oA,
      db,
    );
    await expect(enviarTransferencia(t.id, c.gA, db)).rejects.toMatchObject({ codigo: "SALDO_INSUFICIENTE" });
  });

  it("não envia duas vezes e quem enviou não confirma o recebimento", async () => {
    await entradaValidada(c, c.A.id, c.ambos.id, 50);
    const t = await criarTransferencia({ origemId: c.A.id, destinoId: c.B.id, dataTransferencia: hoje, itens: [{ produtoId: c.ambos.id, quantidade: 10 }] }, c.oA, db);
    await enviarTransferencia(t.id, c.admin, db);
    await expect(enviarTransferencia(t.id, c.admin, db)).rejects.toMatchObject({ codigo: "STATUS_INVALIDO" });
    await expect(
      confirmarRecebimento({ transferenciaId: t.id, itens: [{ itemId: t.itens[0].id, quantidadeRecebida: 10 }] }, c.admin, db),
    ).rejects.toMatchObject({ codigo: "SEGREGACAO" });
    expect(await saldo(c.A.id, c.ambos.id)).toBe(40);
  });

  it("falta no recebimento: segue em trânsito até análise; ajuste aprovado reduz o total do grupo", async () => {
    await entradaValidada(c, c.A.id, c.ambos.id, 100);
    const t = await criarTransferencia({ origemId: c.A.id, destinoId: c.B.id, dataTransferencia: hoje, itens: [{ produtoId: c.ambos.id, quantidade: 100 }] }, c.oA, db);
    await enviarTransferencia(t.id, c.gA, db);
    await confirmarRecebimento({ transferenciaId: t.id, itens: [{ itemId: t.itens[0].id, quantidadeRecebida: 97 }] }, c.oB, db);
    expect((await db.transferencia.findUniqueOrThrow({ where: { id: t.id } })).status).toBe("DIVERGENTE");
    expect(await grupo(c.ambos.id)).toEqual({ disponivel: 97, transito: 3, total: 100 });

    await expect(resolverDivergencia(t.itens[0].id, "AJUSTE_APROVADO", "curto", c.gB, db)).rejects.toMatchObject({ codigo: "JUSTIFICATIVA" });
    await resolverDivergencia(t.itens[0].id, "AJUSTE_APROVADO", "Perda constatada no transporte, laudo anexado.", c.gB, db);
    expect(await grupo(c.ambos.id)).toEqual({ disponivel: 97, transito: 0, total: 97 });
    expect((await db.transferencia.findUniqueOrThrow({ where: { id: t.id } })).status).toBe("RECEBIDA");
  });

  it("falta resolvida como retorno à origem devolve o saldo da origem", async () => {
    await entradaValidada(c, c.A.id, c.ambos.id, 100);
    const t = await criarTransferencia({ origemId: c.A.id, destinoId: c.B.id, dataTransferencia: hoje, itens: [{ produtoId: c.ambos.id, quantidade: 100 }] }, c.oA, db);
    await enviarTransferencia(t.id, c.gA, db);
    await confirmarRecebimento({ transferenciaId: t.id, itens: [{ itemId: t.itens[0].id, quantidadeRecebida: 90 }] }, c.oB, db);
    await resolverDivergencia(t.itens[0].id, "RETORNO_ORIGEM", "Dez unidades não foram carregadas no veículo.", c.gB, db);
    expect(await saldo(c.A.id, c.ambos.id)).toBe(10);
    expect(await saldo(c.B.id, c.ambos.id)).toBe(90);
    expect(await grupo(c.ambos.id)).toEqual({ disponivel: 100, transito: 0, total: 100 });
  });

  it("sobra no recebimento só entra no estoque após aprovação", async () => {
    await entradaValidada(c, c.A.id, c.ambos.id, 100);
    const t = await criarTransferencia({ origemId: c.A.id, destinoId: c.B.id, dataTransferencia: hoje, itens: [{ produtoId: c.ambos.id, quantidade: 50 }] }, c.oA, db);
    await enviarTransferencia(t.id, c.gA, db);
    await confirmarRecebimento({ transferenciaId: t.id, itens: [{ itemId: t.itens[0].id, quantidadeRecebida: 52 }] }, c.oB, db);
    expect(await grupo(c.ambos.id)).toEqual({ disponivel: 100, transito: 0, total: 100 });
    await resolverDivergencia(t.itens[0].id, "AJUSTE_APROVADO", "Sobra confirmada em recontagem com testemunha.", c.gB, db);
    expect(await saldo(c.B.id, c.ambos.id)).toBe(52);
    expect(await grupo(c.ambos.id)).toEqual({ disponivel: 102, transito: 0, total: 102 });
  });

  it("transferência no sentido inverso (B → A) funciona igual", async () => {
    await entradaValidada(c, c.B.id, c.ambos.id, 20);
    const t = await criarTransferencia({ origemId: c.B.id, destinoId: c.A.id, dataTransferencia: hoje, itens: [{ produtoId: c.ambos.id, quantidade: 20 }] }, c.oB, db);
    await enviarTransferencia(t.id, c.gB, db);
    await confirmarRecebimento({ transferenciaId: t.id, itens: [{ itemId: t.itens[0].id, quantidadeRecebida: 20 }] }, c.oA, db);
    expect(await saldo(c.A.id, c.ambos.id)).toBe(20);
    expect(await saldo(c.B.id, c.ambos.id)).toBe(0);
  });
});
