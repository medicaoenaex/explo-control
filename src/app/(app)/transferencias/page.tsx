import type { StatusTransferencia } from "@prisma/client";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { contexto } from "@/server/contexto";
import { formatarCnpj, formatarData, formatarQtd } from "@/lib/formato";
import { STATUS_TRF } from "@/lib/rotulos";
import { Cabecalho, Campo, Cartao, estiloInput, Filtros, Selo } from "@/components/ui";

export const metadata = { title: "Transferências" };

export default async function PaginaTransferencias({ searchParams }: { searchParams: Promise<{ status?: string; sentido?: string }> }) {
  const f = await searchParams;
  const ctx = await contexto();
  const status = f.status && f.status in STATUS_TRF ? (f.status as StatusTransferencia) : undefined;
  const ids = ctx.unidadeIds;
  const lista = await prisma.transferencia.findMany({
    where: {
      status: status === "EM_TRANSITO" ? { in: ["EM_TRANSITO", "AGUARDANDO_CONFERENCIA"] } : status,
      ...(f.sentido === "enviadas" ? { origemId: { in: ids } } : f.sentido === "recebidas" ? { destinoId: { in: ids } } : { OR: [{ origemId: { in: ids } }, { destinoId: { in: ids } }] }),
    },
    include: { origem: true, destino: true, enviadoPor: true, recebidoPor: true, itens: { include: { produto: { include: { unidadeMedida: true } }, lote: true } } },
    orderBy: [{ dataTransferencia: "desc" }, { codigo: "desc" }],
  });

  return (
    <>
      <Cabecalho titulo="Transferências" descricao="Envios entre paióis nos dois sentidos. O destino só recebe o saldo após a conferência." />
      <Filtros>
        <Campo rotulo="Status">
          <select name="status" defaultValue={f.status ?? ""} className={estiloInput}>
            <option value="">Todos</option>
            {Object.entries(STATUS_TRF).map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Sentido">
          <select name="sentido" defaultValue={f.sentido ?? ""} className={estiloInput}>
            <option value="">Enviadas e recebidas</option>
            <option value="enviadas">Enviadas pela unidade</option>
            <option value="recebidas">Recebidas pela unidade</option>
          </select>
        </Campo>
      </Filtros>
      <div className="flex flex-col gap-3">
        {lista.length === 0 && <Cartao className="texto-suave p-8 text-center text-sm">Nenhuma transferência encontrada.</Cartao>}
        {lista.map((t) => (
          <Cartao key={t.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{t.codigo} <span className="texto-suave text-sm font-normal">· doc. {t.documento ?? "—"}</span></p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm">
                  {t.origem.nome} <span className="texto-suave text-xs">({formatarCnpj(t.cnpjOrigem)})</span>
                  <ArrowRight className="text-acento-500 size-4" />
                  {t.destino.nome} <span className="texto-suave text-xs">({formatarCnpj(t.cnpjDestino)})</span>
                </p>
              </div>
              <Selo tom={STATUS_TRF[t.status].tom}>{STATUS_TRF[t.status].rotulo}</Selo>
            </div>
            <table className="mt-3 w-full text-sm">
              <thead className="texto-suave text-xs"><tr><th className="py-1 text-left font-medium">Produto</th><th className="text-right font-medium">Enviado</th><th className="text-right font-medium">Recebido</th></tr></thead>
              <tbody>
                {t.itens.map((i) => {
                  const div = i.quantidadeRecebida && !i.quantidadeRecebida.eq(i.quantidadeEnviada);
                  return (
                    <tr key={i.id} className="borda border-t">
                      <td className="py-1.5">{i.produto.codigo} · {i.produto.descricao}{i.lote && <span className="texto-suave text-xs"> · lote {i.lote.numero}</span>}</td>
                      <td className="text-right tabular-nums">{formatarQtd(i.quantidadeEnviada)} {i.produto.unidadeMedida.sigla}</td>
                      <td className={`text-right tabular-nums ${div ? "font-semibold text-red-600 dark:text-red-400" : ""}`}>
                        {i.quantidadeRecebida ? `${formatarQtd(i.quantidadeRecebida)} ${i.produto.unidadeMedida.sigla}` : "—"}
                        {div && i.resolucao && <span className="texto-suave block text-xs font-normal">analisada</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="texto-suave mt-2 text-xs">
              Data {formatarData(t.dataTransferencia)} · Envio: {t.enviadoPor?.nome ?? "—"} {t.enviadoEm && `em ${formatarData(t.enviadoEm)}`} · Recebimento: {t.recebidoPor?.nome ?? "—"} {t.recebidoEm && `em ${formatarData(t.recebidoEm)}`}
            </p>
          </Cartao>
        ))}
      </div>
    </>
  );
}
