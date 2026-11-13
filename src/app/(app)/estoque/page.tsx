import { contexto } from "@/server/contexto";
import { saldosPorUnidade } from "@/server/estoque";
import { prisma } from "@/lib/db";
import { formatarQtd } from "@/lib/formato";
import { Botao, Cabecalho, Campo, estiloInput, Filtros, Selo, Tabela } from "@/components/ui";

export const metadata = { title: "Estoque por unidade" };

export default async function PaginaEstoque({ searchParams }: { searchParams: Promise<{ unidade?: string; categoria?: string; q?: string}> }) {
  const f = await searchParams;
  const ctx = await contexto();
  const unidadeId = f.unidade && ctx.usuario.unidades.some((u) => u.id === f.unidade) ? f.unidade : ctx.unidade?.id;
  const [linhas0, categorias] = await Promise.all([
    saldosPorUnidade({ unidadeId, categoriaId: f.categoria || undefined }),
    prisma.categoria.findMany({ orderBy: { nome: "asc" } }),
  ]);
  const q = f.q?.toLowerCase();
  const linhas = linhas0
    .filter((l) => ctx.usuario.unidades.some((u) => u.id === l.unidadeId)) // só unidades que o usuário acessa
    .filter((l) => !q || l.codigo.toLowerCase().includes(q) || l.descricao.toLowerCase().includes(q) || l.codigoLocal.toLowerCase().includes(q));
  const nomeUnidade = ctx.usuario.unidades.find((u) => u.id === unidadeId)?.nome;

  return (
    <>
      <Cabecalho
        titulo={nomeUnidade ? `Estoque · ${nomeUnidade}` : "Estoque por unidade"}
        descricao="Saldo disponível calculado a partir das movimentações validadas. Não é editável."
        acoes={<Botao href="/estoque/consolidado" variante="secundario">Ver consolidado do grupo</Botao>}
      />
      <Filtros>
        <Campo rotulo="Unidade">
          <select name="unidade" defaultValue={unidadeId ?? ""} className={estiloInput}>
            <option value="">Todas</option>
            {ctx.usuario.unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Categoria">
          <select name="categoria" defaultValue={f.categoria ?? ""} className={estiloInput}>
            <option value="">Todas</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Pesquisa"><input name="q" defaultValue={f.q} placeholder="Código ou descrição" className={estiloInput} /></Campo>
      </Filtros>
      <Tabela
        linhas={linhas}
        chave={(l) => `${l.unidadeId}:${l.produtoId}`}
        colunas={[
          { titulo: "Código", celula: (l) => <span className="font-medium whitespace-nowrap">{l.codigo}</span> },
          { titulo: "Cód. local", celula: (l) => l.codigoLocal, ocultarMobile: true },
          { titulo: "Descrição", celula: (l) => l.descricao },
          { titulo: "Categoria", celula: (l) => l.categoria, ocultarMobile: true },
          { titulo: "Unidade", celula: (l) => l.unidade },
          { titulo: "Situação", celula: (l) => <Selo tom={l.situacaoVinculo === "ATIVO" ? "sucesso" : "neutro"}>{l.situacaoVinculo === "ATIVO" ? "Ativo" : "Inativo"}</Selo> },
          { titulo: "Disponível", alinhar: "direita", celula: (l) => <b className={l.disponivel.isZero() ? "texto-suave" : ""}>{formatarQtd(l.disponivel)} <span className="texto-suave font-normal">{l.unidadeMedida}</span></b> },
        ]}
      />
    </>
  );
}
