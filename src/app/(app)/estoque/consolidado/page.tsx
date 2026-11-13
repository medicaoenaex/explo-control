import { Info } from "lucide-react";
import { contexto } from "@/server/contexto";
import { estoqueConsolidado } from "@/server/estoque";
import { prisma } from "@/lib/db";
import { formatarQtd } from "@/lib/formato";
import { Cabecalho, Campo, Cartao, estiloInput, Filtros, Tabela } from "@/components/ui";

export const metadata = { title: "Estoque consolidado" };

export default async function PaginaConsolidado({ searchParams }: { searchParams: Promise<{ categoria?: string }> }) {
  const f = await searchParams;
  const ctx = await contexto();
  const [linhas, categorias, unidades] = await Promise.all([
    estoqueConsolidado({ categoriaId: f.categoria || undefined }),
    prisma.categoria.findMany({ orderBy: { nome: "asc" } }),
    prisma.unidade.findMany({ where: { id: { in: ctx.usuario.unidades.map((u) => u.id) } }, orderBy: { nome: "asc" } }),
  ]);
  const q = (v: { toString(): string }, um: string) => <>{formatarQtd(v as never)} <span className="texto-suave text-xs">{um}</span></>;

  return (
    <>
      <Cabecalho titulo="Estoque consolidado do grupo" descricao="Saldo de cada paiol, material em trânsito e total do grupo — sem duplicar transferências internas." />
      <Cartao className="mb-4 flex gap-3 p-4 text-sm">
        <Info className="text-marca-500 mt-0.5 size-4 shrink-0" />
        <p className="texto-suave">
          Ao enviar uma transferência, a quantidade sai do saldo disponível da origem e passa para <b>Em trânsito</b>. Ela só entra no saldo do destino depois da conferência.
          Por isso, <b>Total do grupo = disponível nas unidades + em trânsito</b>: o mesmo material nunca é contado duas vezes.
        </p>
      </Cartao>
      <Filtros>
        <Campo rotulo="Categoria">
          <select name="categoria" defaultValue={f.categoria ?? ""} className={estiloInput}>
            <option value="">Todas</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Campo>
      </Filtros>
      <Tabela
        linhas={linhas}
        chave={(l) => l.produtoId}
        colunas={[
          { titulo: "Código", celula: (l) => <span className="font-medium whitespace-nowrap">{l.codigo}</span> },
          { titulo: "Descrição", celula: (l) => l.descricao },
          ...unidades.map((u) => ({
            titulo: u.nome,
            alinhar: "direita" as const,
            celula: (l: (typeof linhas)[number]) => (u.id in l.porUnidade ? q(l.porUnidade[u.id], l.unidadeMedida) : <span className="texto-suave text-xs">não cadastrado</span>),
          })),
          { titulo: "Em trânsito", alinhar: "direita", celula: (l) => (l.emTransito.isZero() ? <span className="texto-suave">—</span> : <span className="text-sky-700 dark:text-sky-300">{q(l.emTransito, l.unidadeMedida)}</span>) },
          { titulo: "Total do grupo", alinhar: "direita", celula: (l) => <b>{q(l.total, l.unidadeMedida)}</b> },
        ]}
      />
    </>
  );
}
