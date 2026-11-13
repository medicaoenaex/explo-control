import { prisma } from "@/lib/db";
import { contexto } from "@/server/contexto";
import { pode } from "@/server/permissoes";
import { confrontoSicoex, type LinhaConfronto } from "@/server/sicoex";
import { formatarDia, formatarQtd } from "@/lib/formato";
import { Cabecalho, Selo, Tabela } from "@/components/ui";
import { FormSicoex } from "./FormSicoex";

export const metadata = { title: "Sicoex" };

const qtd = (v: { toString(): string }, sigla: string) => <span className="tabular-nums whitespace-nowrap">{formatarQtd(v as never)} <span className="texto-suave">{sigla}</span></span>;

function colunas(historico: boolean) {
  return [
    { titulo: "Paiol", celula: (l: LinhaConfronto) => l.unidade },
    { titulo: "Produto", celula: (l: LinhaConfronto) => l.produto },
    { titulo: "Data Sicoex", celula: (l: LinhaConfronto) => formatarDia(l.data) },
    { titulo: "Saldo Sicoex", alinhar: "direita" as const, celula: (l: LinhaConfronto) => <b>{qtd(l.saldoSicoex, l.sigla)}</b> },
    { titulo: "Diário na data", alinhar: "direita" as const, celula: (l: LinhaConfronto) => qtd(l.saldoDiarioNaData, l.sigla) },
    {
      titulo: "Diferença",
      alinhar: "direita" as const,
      celula: (l: LinhaConfronto) =>
        l.diferenca.isZero() ? <Selo tom="sucesso">Confere</Selo> : <Selo tom="perigo">{l.diferenca.isPos() ? "+" : "−"}{formatarQtd(l.diferenca.abs())} {l.sigla}</Selo>,
    },
    ...(historico
      ? [{ titulo: "Registrado por", celula: (l: LinhaConfronto) => <span className="text-xs">{l.registradoPor}{l.observacoes && <span className="texto-suave block">{l.observacoes}</span>}</span>, ocultarMobile: true }]
      : [
          { titulo: "Consumo diário a lançar", alinhar: "direita" as const, celula: (l: LinhaConfronto) => qtd(l.consumoDepois, l.sigla) },
          { titulo: "Saldo diário hoje", alinhar: "direita" as const, celula: (l: LinhaConfronto) => qtd(l.saldoDiarioAtual, l.sigla) },
        ]),
  ];
}

export default async function PaginaSicoex({ searchParams }: { searchParams: Promise<{ salvo?: string }> }) {
  const f = await searchParams;
  const ctx = await contexto();
  const ator = ctx.usuario.ator;
  const podeRegistrar = ctx.unidadeIds.filter((id) => pode(ator, "lancamento.registrar", id));
  const vinculos = podeRegistrar.length
    ? await prisma.produtoUnidade.findMany({
        where: { unidadeId: { in: podeRegistrar }, situacao: "ATIVO" },
        include: { produto: { include: { unidadeMedida: true } }, unidade: true },
        orderBy: [{ unidade: { nome: "asc" } }, { produto: { descricao: "asc" } }],
      })
    : [];
  const atuais = await confrontoSicoex({ unidadeIds: ctx.unidadeIds, ultimos: true });
  const historico = await confrontoSicoex({ unidadeIds: ctx.unidadeIds });
  const divergentes = atuais.filter((l) => !l.diferenca.isZero()).length;
  const hoje = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);

  return (
    <>
      <Cabecalho
        titulo="Sicoex"
        descricao="Confronto do saldo lançado no Sicoex (no dia do desmonte) com o controle diário do sistema, na mesma data."
      />
      {f.salvo && <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Saldo Sicoex registrado.</p>}
      {vinculos.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold">Registrar saldo do Sicoex</h2>
          <FormSicoex hoje={hoje} opcoes={vinculos.map((v) => ({ valor: `${v.unidadeId}|${v.produtoId}`, unidade: v.unidade.nome, rotulo: `${v.produto.codigo} · ${v.produto.descricao} (${v.produto.unidadeMedida.sigla})` }))} />
          <p className="texto-suave mt-2 text-xs">Se já existir registro para o mesmo paiol, produto e data, o novo valor substitui o anterior (fica no histórico de auditoria).</p>
        </section>
      )}

      <section className="mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">Situação atual (último lançamento de cada produto)</h2>
          {atuais.length > 0 && (divergentes ? <Selo tom="perigo">{divergentes} com diferença</Selo> : <Selo tom="sucesso">Tudo confere</Selo>)}
        </div>
        <Tabela linhas={atuais} chave={(l) => l.registroId} colunas={colunas(false)} vazio="Nenhum saldo do Sicoex registrado ainda." />
        <p className="texto-suave mt-2 text-xs">
          <b>Diferença</b> = saldo Sicoex − saldo diário do sistema no fim do mesmo dia. <b>Consumo diário a lançar</b> = consumo registrado no sistema depois dessa data, que deve entrar no Sicoex no próximo desmonte.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Histórico de lançamentos Sicoex</h2>
        <Tabela linhas={historico} chave={(l) => l.registroId} colunas={colunas(true)} vazio="Nenhum registro." />
      </section>
    </>
  );
}
