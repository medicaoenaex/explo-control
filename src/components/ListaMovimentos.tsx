import type { StatusMovimento, TipoMovimento } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatarData, formatarQtd } from "@/lib/formato";
import { STATUS_MOV, TIPO_MOV } from "@/lib/rotulos";
import { Campo, estiloInput, Filtros, Selo, Tabela } from "@/components/ui";

/** Histórico de movimentações, com validação opcional dos pendentes. */
export async function ListaMovimentos({ tipos, unidadeIds, f, validar }: {
  tipos: TipoMovimento[];
  unidadeIds: string[];
  f: { status?: string; de?: string; ate?: string; documento?: string };
  /** Quando informado, lançamentos pendentes ganham o botão "Validar". */
  validar?: { action: (fd: FormData) => Promise<void>; pode: (unidadeId: string, criadoPorId: string) => boolean; volta?: string };
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
    include: { produtoUnidade: { include: { produto: { include: { unidadeMedida: true } }, unidade: true } }, lote: true, criadoPor: true, validadoPor: true, transferenciaItem: { include: { transferencia: { include: { origem: true } } } } },
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
          { titulo: "Tipo", celula: (m) => m.tipo === "TRANSFERENCIA_ENTRADA" && m.transferenciaItem
            ? <span>Transferência<span className="texto-suave block text-xs">de {m.transferenciaItem.transferencia.origem.nome} · {m.transferenciaItem.transferencia.codigo}</span></span>
            : TIPO_MOV[m.tipo], ocultarMobile: true },
          { titulo: "Unidade", celula: (m) => m.produtoUnidade.unidade.nome },
          { titulo: "Produto", celula: (m) => <>{m.produtoUnidade.produto.codigo} · {m.produtoUnidade.produto.descricao}{m.lote && <span className="texto-suave text-xs"> · lote {m.lote.numero}</span>}</> },
          { titulo: "Documento", celula: (m) => m.documento ?? "—" },
          { titulo: "Quantidade", alinhar: "direita", celula: (m) => <b>{formatarQtd(m.quantidade.abs())} <span className="texto-suave font-normal">{m.produtoUnidade.produto.unidadeMedida.sigla}</span></b> },
          { titulo: "Responsável", celula: (m) => <span className="text-xs">{m.criadoPor.nome}{m.validadoPor && <span className="texto-suave block">validado: {m.validadoPor.nome}</span>}</span>, ocultarMobile: true },
          { titulo: "Situação", celula: (m) => <span className="flex flex-wrap items-center gap-2"><Selo tom={STATUS_MOV[m.status].tom}>{STATUS_MOV[m.status].rotulo}</Selo>
            {validar && m.status === "PENDENTE" && validar.pode(m.produtoUnidade.unidadeId, m.criadoPorId) && (
              <form action={validar.action}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="volta" value={validar.volta ?? "/entradas"} />
                <button className="bg-marca-700 hover:bg-marca-800 rounded-md px-2 py-1 text-xs font-medium text-white">Validar</button>
              </form>
            )}</span> },
        ]}
      />
    </>
  );
}
