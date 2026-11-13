import type { Prisma } from "@prisma/client";
import { ArrowDownToLine, ArrowRight, CheckCircle2, Flame, type LucideIcon, Repeat } from "lucide-react";
import { prisma } from "@/lib/db";
import { contexto } from "@/server/contexto";
import { formatarData, formatarQtd } from "@/lib/formato";
import { STATUS_MOV, TIPO_MOV } from "@/lib/rotulos";
import { Cabecalho, Campo, Cartao, estiloInput, Filtros, Selo } from "@/components/ui";

export const metadata = { title: "Notas fiscais" };

type F = { q?: string; unidade?: string; de?: string; ate?: string };
type Evento = { quando: Date; icone: LucideIcon; titulo: React.ReactNode; detalhe: string; selo?: React.ReactNode };

const incluir = {
  produtoUnidade: { include: { produto: { include: { unidadeMedida: true } }, unidade: true } },
  lote: true,
  criadoPor: true,
  validadoPor: true,
  transferenciaItem: { include: { transferencia: { include: { origem: true, destino: true } } } },
} satisfies Prisma.MovimentoInclude;
type Mov = Prisma.MovimentoGetPayload<{ include: typeof incluir }>;

/** Linha do tempo de cada nota fiscal: lançamento, validação, transferências e consumos ligados a ela. */
export default async function PaginaNotas({ searchParams }: { searchParams: Promise<F> }) {
  const f = await searchParams;
  const ctx = await contexto();
  const unidadeIds = f.unidade && ctx.unidadeIds.includes(f.unidade) ? [f.unidade] : ctx.unidadeIds;
  const q = f.q?.trim();

  const filtro: Prisma.MovimentoWhereInput = {
    documento: { not: null },
    produtoUnidade: { unidadeId: { in: unidadeIds } },
    dataMovimento: { gte: f.de ? new Date(`${f.de}T00:00:00-03:00`) : undefined, lte: f.ate ? new Date(`${f.ate}T23:59:59-03:00`) : undefined },
    ...(q
      ? {
          OR: [
            { documento: { contains: q, mode: "insensitive" } },
            { fornecedor: { contains: q, mode: "insensitive" } },
            { produtoUnidade: { produto: { descricao: { contains: q, mode: "insensitive" } } } },
            { produtoUnidade: { produto: { codigo: { contains: q, mode: "insensitive" } } } },
            { lote: { numero: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const achados = await prisma.movimento.groupBy({
    by: ["documento"],
    where: filtro,
    _max: { criadoEm: true },
    orderBy: { _max: { criadoEm: "desc" } },
    take: 50,
  });
  const documentos = achados.map((a) => a.documento!).filter(Boolean);
  const movs = documentos.length
    ? await prisma.movimento.findMany({
        where: { documento: { in: documentos }, produtoUnidade: { unidadeId: { in: ctx.unidadeIds } } },
        include: incluir,
        orderBy: { criadoEm: "asc" },
      })
    : [];
  const porNota = new Map<string, Mov[]>(documentos.map((d) => [d, []]));
  for (const m of movs) porNota.get(m.documento!)?.push(m);

  return (
    <>
      <Cabecalho titulo="Notas fiscais" descricao="Linha do tempo de cada nota: lançamento, validação, transferências e consumos." />
      <Filtros>
        <Campo rotulo="Pesquisar">
          <input name="q" defaultValue={f.q} placeholder="Nº da nota, produto, lote ou fornecedor" className={`${estiloInput} sm:w-72`} />
        </Campo>
        <Campo rotulo="Paiol">
          <select name="unidade" defaultValue={f.unidade ?? ""} className={estiloInput}>
            <option value="">Todos</option>
            {ctx.usuario.unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </Campo>
        <Campo rotulo="De"><input type="date" name="de" defaultValue={f.de} className={estiloInput} /></Campo>
        <Campo rotulo="Até"><input type="date" name="ate" defaultValue={f.ate} className={estiloInput} /></Campo>
      </Filtros>

      <p className="texto-suave mb-3 text-sm">{documentos.length === 0 ? "Nenhuma nota encontrada." : `${documentos.length} nota(s)${documentos.length === 50 ? " — mostrando as 50 mais recentes; refine a pesquisa" : ""}.`}</p>
      <div className="flex flex-col gap-4">
        {[...porNota].map(([doc, lista]) => <CartaoNota key={doc} documento={doc} movs={lista} />)}
      </div>
    </>
  );
}

const dataHora = (d: Date) =>
  d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

function CartaoNota({ documento, movs }: { documento: string; movs: Mov[] }) {
  const fornecedor = movs.find((m) => m.fornecedor)?.fornecedor;
  const eventos: Evento[] = [];
  const itensVistos = new Set<string>();
  for (const m of movs) {
    const p = m.produtoUnidade.produto;
    const qtd = `${formatarQtd(m.quantidade.abs())} ${p.unidadeMedida.sigla}`;
    const prod = `${p.codigo} · ${p.descricao}${m.lote ? ` · lote ${m.lote.numero}` : ""}`;
    const trf = m.transferenciaItem?.transferencia;
    if (trf) {
      if (itensVistos.has(m.transferenciaItemId!)) continue;
      itensVistos.add(m.transferenciaItemId!);
      eventos.push({
        quando: m.criadoEm,
        icone: Repeat,
        titulo: <>Transferência {trf.codigo}: {trf.origem.nome} <ArrowRight className="inline size-3.5" /> {trf.destino.nome}</>,
        detalhe: `${qtd} de ${prod} · por ${m.criadoPor.nome}`,
      });
      continue;
    }
    eventos.push({
      quando: m.criadoEm,
      icone: m.tipo === "CONSUMO" ? Flame : ArrowDownToLine,
      titulo: <>{TIPO_MOV[m.tipo]} em {m.produtoUnidade.unidade.nome}</>,
      detalhe: `${qtd} de ${prod} · lançado por ${m.criadoPor.nome}${m.observacoes ? ` · ${m.observacoes}` : ""}`,
      selo: <Selo tom={STATUS_MOV[m.status].tom}>{STATUS_MOV[m.status].rotulo}</Selo>,
    });
    if (m.validadoEm && m.validadoPor) {
      eventos.push({ quando: m.validadoEm, icone: CheckCircle2, titulo: <>Validado</>, detalhe: `${prod} · por ${m.validadoPor.nome}` });
    }
  }
  eventos.sort((a, b) => a.quando.getTime() - b.quando.getTime());
  const dataNota = movs.length ? formatarData(movs.reduce((a, b) => (a.dataMovimento < b.dataMovimento ? a : b)).dataMovimento) : "—";

  return (
    <Cartao className="p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">{/^nf/i.test(documento) ? documento : `NF ${documento}`}</h2>
        <p className="texto-suave text-xs">Data da nota {dataNota}{fornecedor ? ` · ${fornecedor}` : ""}</p>
      </div>
      <ol className="borda mt-4 ml-2 border-l">
        {eventos.map((e, i) => (
          <li key={i} className="relative pb-4 pl-6 last:pb-0">
            <span className="superficie borda absolute -left-3 top-0 flex size-6 items-center justify-center rounded-full border">
              <e.icone className="text-marca-700 size-3.5 dark:text-marca-300" />
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">{e.titulo}</p>
              {e.selo}
            </div>
            <p className="texto-suave mt-0.5 text-xs">{dataHora(e.quando)} · {e.detalhe}</p>
          </li>
        ))}
      </ol>
    </Cartao>
  );
}
