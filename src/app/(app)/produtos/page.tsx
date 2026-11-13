import { prisma } from "@/lib/db";
import { contexto } from "@/server/contexto";
import { formatarData } from "@/lib/formato";
import { Cabecalho, Campo, estiloInput, Filtros, Selo, Tabela } from "@/components/ui";

export const metadata = { title: "Produtos e materiais" };

const CLASSE: Record<string, string> = {
  EXPLOSIVO: "Explosivo",
  ACESSORIO_EXPLOSIVO: "Acessório explosivo",
  INSUMO_PRODUCAO: "Insumo de produção",
  MATERIAL_GERAL: "Material geral",
};

export default async function PaginaProdutos({ searchParams }: { searchParams: Promise<{ q?: string; categoria?: string; unidade?: string; presenca?: string }> }) {
  const f = await searchParams;
  await contexto();
  const [produtos, unidades, categorias] = await Promise.all([
    prisma.produto.findMany({
      where: {
        categoriaId: f.categoria || undefined,
        ...(f.q ? { OR: [{ codigo: { contains: f.q, mode: "insensitive" } }, { descricao: { contains: f.q, mode: "insensitive" } }, { vinculos: { some: { codigoLocal: { contains: f.q, mode: "insensitive" } } } }] } : {}),
      },
      include: { categoria: true, unidadeMedida: true, criadoPor: true, vinculos: true },
      orderBy: { codigo: "asc" },
    }),
    prisma.unidade.findMany({ orderBy: { nome: "asc" } }),
    prisma.categoria.findMany({ orderBy: { nome: "asc" } }),
  ]);
  const filtrados = produtos.filter((p) => {
    if (!f.unidade) return true;
    const v = p.vinculos.find((x) => x.unidadeId === f.unidade);
    return f.presenca === "ausente" ? !v : !!v;
  }).filter((p) => f.presenca !== "ambas" || unidades.every((u) => p.vinculos.some((v) => v.unidadeId === u.id && v.situacao === "ATIVO")));

  return (
    <>
      <Cabecalho titulo="Produtos e materiais" descricao="Catálogo central do grupo e o cadastro operacional de cada paiol. O cadastro em uma unidade não libera o produto nas demais." />
      <Filtros>
        <Campo rotulo="Pesquisa"><input name="q" defaultValue={f.q} placeholder="Código central, local ou descrição" className={estiloInput} /></Campo>
        <Campo rotulo="Categoria">
          <select name="categoria" defaultValue={f.categoria ?? ""} className={estiloInput}>
            <option value="">Todas</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Unidade">
          <select name="unidade" defaultValue={f.unidade ?? ""} className={estiloInput}>
            <option value="">Qualquer</option>
            {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Presença">
          <select name="presenca" defaultValue={f.presenca ?? ""} className={estiloInput}>
            <option value="">Cadastrado na unidade</option>
            <option value="ausente">Não cadastrado na unidade</option>
            <option value="ambas">Ativo em todas as unidades</option>
          </select>
        </Campo>
      </Filtros>
      <Tabela
        linhas={filtrados}
        chave={(p) => p.id}
        colunas={[
          { titulo: "Código", celula: (p) => <span className="font-medium whitespace-nowrap">{p.codigo}</span> },
          { titulo: "Descrição", celula: (p) => p.descricao },
          { titulo: "Categoria", celula: (p) => p.categoria.nome, ocultarMobile: true },
          { titulo: "Classificação", celula: (p) => CLASSE[p.classificacao], ocultarMobile: true },
          { titulo: "UM", celula: (p) => p.unidadeMedida.sigla },
          { titulo: "Lote", celula: (p) => (p.controlaLote ? "Sim" : "Não"), ocultarMobile: true },
          ...unidades.map((u) => ({
            titulo: u.nome,
            celula: (p: (typeof filtrados)[number]) => {
              const v = p.vinculos.find((x) => x.unidadeId === u.id);
              if (!v) return <Selo>Não cadastrado</Selo>;
              return <span className="inline-flex flex-wrap items-center gap-1.5"><Selo tom={v.situacao === "ATIVO" ? "sucesso" : "alerta"}>{v.situacao === "ATIVO" ? "Cadastrado" : "Inativo"}</Selo><span className="texto-suave text-xs whitespace-nowrap">{v.codigoLocal}</span></span>;
            },
          })),
          { titulo: "Situação", celula: (p) => <Selo tom={p.situacao === "ATIVO" ? "sucesso" : "neutro"}>{p.situacao === "ATIVO" ? "Ativo" : "Inativo"}</Selo>, ocultarMobile: true },
          { titulo: "Cadastro", celula: (p) => <span className="texto-suave text-xs">{formatarData(p.criadoEm)}<br />{p.criadoPor.nome}</span>, ocultarMobile: true },
        ]}
      />
    </>
  );
}
