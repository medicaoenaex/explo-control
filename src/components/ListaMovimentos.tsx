import type { StatusMovimento, TipoMovimento } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatarData, formatarQtd } from "@/lib/formato";
import { STATUS_MOV, TIPO_MOV } from "@/lib/rotulos";
import { Campo, estiloInput, Filtros, Selo, Tabela } from "@/components/ui";

/** Histórico de movimentações (somente leitura nesta etapa). */
export async function ListaMovimentos({ tipos, unidadeIds, f }: {
  tipos: TipoMovimento[];
  unidadeIds: string[];
  f: { status?: string; de?: string; ate?: string; documento?: string };
}) {
  const status = f.status && f.status in STATUS_MOV ? (f.status as StatusMovimento) : undefined;
  const movs = await prisma.movimento.findMany({
    where: {
      tipo: { in: tipos },
      status,
      produtoUnidade: { unidadeId: { in: unidadeIds } },
      documento: f.documento ? { contains: f.documento, mode: "insensitive" } : undefined,
      dataMovimento: { gte: f.de ? new Date(`${f.de}T00:00:00-03:00`) : undefined, lte: f.ate ? new Date(`${f.ate}T23:59:59-03:00`) : undefined },
    },
    include: { produtoUnidade: { include: { produto: { include: { unidadeMedida: true } }, unidade: true } }, lote: true, criadoPor: true, validadoPor: true },
    orderBy: [{ dataMovimento: "desc" }, { criadoEm: "desc" }],
    take: 300,
  });
  return (
    <>
      <Filtros>
        <Campo rotulo="De"><input type="date" name="de" defaultValue={f.de} className={estiloInput} /></Campo>
        <Campo rotulo="Até"><input type="date" name="ate" defaultValue={f.ate} className={estiloInput} /></Campo>
        <Campo rotulo="Documento"><input name="documento" defaultValue={f.documento} className={estiloInput} /></Campo>
        <Campo rotulo="Situação">
          <select name="status" defaultValue={f.status ?? ""} className={estiloInput}>
            <option value="">Todas</option>
            {Object.entries(STATUS_MOV).map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}
          </select>
        </Campo>
      </Filtros>
      <Tabela
        linhas={movs}
        chave={(m) => m.id}
        colunas={[
          { titulo: "Data", celula: (m) => formatarData(m.dataMovimento) },
          { titulo: "Tipo", celula: (m) => TIPO_MOV[m.tipo], ocultarMobile: true },
          { titulo: "Unidade", celula: (m) => m.produtoUnidade.unidade.nome },
          { titulo: "Produto", celula: (m) => <>{m.produtoUnidade.produto.codigo} · {m.produtoUnidade.produto.descricao}{m.lote && <span className="texto-suave text-xs"> · lote {m.lote.numero}</span>}</> },
          { titulo: "Documento", celula: (m) => m.documento ?? "—" },
          { titulo: "Quantidade", alinhar: "direita", celula: (m) => <b>{formatarQtd(m.quantidade.abs())} <span className="texto-suave font-normal">{m.produtoUnidade.produto.unidadeMedida.sigla}</span></b> },
          { titulo: "Responsável", celula: (m) => <span className="text-xs">{m.criadoPor.nome}{m.validadoPor && <span className="texto-suave block">validado: {m.validadoPor.nome}</span>}</span>, ocultarMobile: true },
          { titulo: "Situação", celula: (m) => <Selo tom={STATUS_MOV[m.status].tom}>{STATUS_MOV[m.status].rotulo}</Selo> },
        ]}
      />
    </>
  );
}
