import { prisma } from "@/lib/db";
import { emTransitoPorProduto, estoqueConsolidado } from "@/server/estoque";

export const dynamic = "force-dynamic";
export const metadata = { title: "Diagnóstico" };

const mascarar = (t: string) => t.replace(/postgres(ql)?:\/\/[^\s"']+/gi, "postgresql://***");

async function teste(nome: string, fn: () => Promise<unknown>) {
  const ini = Date.now();
  try {
    const r = await fn();
    return { nome, ok: true, texto: JSON.stringify(r, (_, v) => (typeof v === "bigint" ? v.toString() : v)).slice(0, 300), ms: Date.now() - ini };
  } catch (e) {
    const x = e as { name?: string; code?: string; message?: string };
    return { nome, ok: false, texto: mascarar(`${x.name ?? "Erro"}${x.code ? ` [${x.code}]` : ""}: ${x.message ?? String(e)}`).slice(0, 2000), ms: Date.now() - ini };
  }
}

/** Autoteste do ambiente de demonstração: mostra o que funciona e o erro exato do que falha. */
export default async function Diagnostico() {
  if (process.env.SEED_DEMO !== "1" && process.env.NODE_ENV === "production") {
    return <p className="p-8">Diagnóstico disponível apenas no ambiente de demonstração.</p>;
  }
  const url = (() => {
    try {
      const u = new URL(process.env.DATABASE_URL ?? "");
      return `${u.hostname}:${u.port} ${u.searchParams.toString()}`;
    } catch {
      return "DATABASE_URL ausente ou inválida";
    }
  })();
  const testes = [];
  for (const [nome, fn] of [
    ["Conexão (SELECT 1)", () => prisma.$queryRaw`SELECT 1 AS ok`],
    ["Empresas", () => prisma.empresa.count()],
    ["Usuários", () => prisma.usuario.count()],
    ["Sessões", () => prisma.sessao.count()],
    ["Unidades", () => prisma.unidade.findMany({ select: { nome: true } })],
    ["Produtos", () => prisma.produto.count()],
    ["Movimentos validados", () => prisma.movimento.count({ where: { status: "VALIDADO" } })],
    ["Transferências por status", () => prisma.transferencia.groupBy({ by: ["status"], _count: true })],
    ["Fechamentos", () => prisma.fechamentoSemanal.findMany({ select: { semanaInicio: true, status: true } })],
    ["Em trânsito", async () => Object.fromEntries([...(await emTransitoPorProduto()).entries()].map(([k, v]) => [k, v.toString()]))],
    ["Estoque consolidado", async () => (await estoqueConsolidado()).length],
    ["Transação com trava", () => prisma.$transaction(async (tx) => tx.$queryRaw`SELECT id FROM "Empresa" LIMIT 1 FOR UPDATE`)],
  ] as [string, () => Promise<unknown>][]) {
    testes.push(await teste(nome, fn));
  }
  const erros = await prisma.auditoria
    .findMany({ where: { acao: "ERRO_SERVIDOR" }, orderBy: { criadoEm: "desc" }, take: 5 })
    .catch(() => []);

  return (
    <main className="mx-auto max-w-4xl p-6 font-mono text-xs">
      <h1 className="mb-1 font-sans text-lg font-semibold">Diagnóstico do EXPLO CONTROL</h1>
      <p className="mb-4">Banco: {url} · Região: {process.env.VERCEL_REGION ?? "local"} · {new Date().toISOString()}</p>
      <table className="w-full border-collapse">
        <tbody>
          {testes.map((t) => (
            <tr key={t.nome} className="border-b align-top">
              <td className="py-1 pr-3 whitespace-nowrap">{t.ok ? "✅" : "❌"} {t.nome}</td>
              <td className="py-1 pr-3 text-right whitespace-nowrap">{t.ms} ms</td>
              <td className="py-1 break-all">{t.texto}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 className="mt-6 mb-2 font-sans font-semibold">Últimos erros de servidor</h2>
      {erros.length === 0 && <p>Nenhum registrado.</p>}
      {erros.map((e) => (
        <pre key={e.id} className="mb-3 border p-2 break-all whitespace-pre-wrap">
          {e.criadoEm.toISOString()} {e.entidade} digest {e.entidadeId}
          {"\n"}
          {mascarar(JSON.stringify(e.dados, null, 1))}
        </pre>
      ))}
    </main>
  );
}
