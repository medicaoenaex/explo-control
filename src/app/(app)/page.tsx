import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import type { Prisma } from "@prisma/client";
import {
  AlertTriangle, ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Building2, CalendarCheck, ClipboardList, Factory,
  FileBarChart, Flame, Layers, Package, Repeat, Truck, Warehouse,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { contexto } from "@/server/contexto";
import { emTransitoPorProduto } from "@/server/estoque";
import { Cabecalho, Campo, Cartao, estiloInput, Filtros, Indicador, Selo } from "@/components/ui";
import { formatarCnpj, formatarData, formatarDia, formatarQtd } from "@/lib/formato";
import { STATUS_TRF } from "@/lib/rotulos";
import { ErroDiagnostico } from "@/components/ErroDiagnostico";

export const metadata = { title: "Painel" };

type Busca = Promise<{ de?: string; ate?: string; empresa?: string; unidade?: string; categoria?: string; produto?: string }>;

const SAIDAS = ["CONSUMO", "TRANSFERENCIA_SAIDA", "PRODUCAO_CONSUMO"] as const;
const ENTRADAS = ["ENTRADA", "TRANSFERENCIA_ENTRADA", "TRANSFERENCIA_RETORNO", "TRANSFERENCIA_SOBRA", "PRODUCAO_ENTRADA"] as const;

async function PainelConteudo({ searchParams }: { searchParams: Busca }) {
  const f = await searchParams;
  const ctx = await contexto();
  const hoje = new Date();
  const de = f.de ? new Date(`${f.de}T00:00:00-03:00`) : new Date(hoje.getTime() - 30 * 864e5);
  const ate = f.ate ? new Date(`${f.ate}T23:59:59-03:00`) : hoje;

  // unidades no escopo: seleção do cabeçalho ∩ filtros da tela
  const unidadesEscopo = ctx.usuario.unidades.filter(
    (u) => ctx.unidadeIds.includes(u.id) && (!f.unidade || u.id === f.unidade) && (!f.empresa || u.empresaId === f.empresa),
  );
  const ids = unidadesEscopo.map((u) => u.id);
  const filtroMov: Prisma.MovimentoWhereInput = {
    status: "VALIDADO",
    dataMovimento: { gte: de, lte: ate },
    produtoUnidade: {
      unidadeId: { in: ids },
      produto: { ...(f.categoria ? { categoriaId: f.categoria } : {}), ...(f.produto ? { id: f.produto } : {}) },
    },
  };
  const filtroTrf: Prisma.TransferenciaWhereInput = {
    OR: [{ origemId: { in: ids } }, { destinoId: { in: ids } }],
    ...(f.produto || f.categoria ? { itens: { some: { produto: { ...(f.produto ? { id: f.produto } : {}), ...(f.categoria ? { categoriaId: f.categoria } : {}) } } } } : {}),
  };

  const [empresas, categorias, produtos, totalUnidades, totalProdutos, movs, entradas, saidas, trfPendentes, divergentes, recentes, fechamentos, transito] =
    await emSequencia([
      () => prisma.empresa.findMany({ orderBy: { nomeFantasia: "asc" } }),
      () => prisma.categoria.findMany({ orderBy: { nome: "asc" } }),
      () => prisma.produto.findMany({ orderBy: { codigo: "asc" }, select: { id: true, codigo: true, descricao: true } }),
      () => prisma.unidade.count({ where: { situacao: "ATIVO" } }),
      () => prisma.produto.count({ where: { situacao: "ATIVO" } }),
      () => prisma.movimento.count({ where: filtroMov }),
      () => prisma.movimento.count({ where: { ...filtroMov, tipo: { in: [...ENTRADAS] } } }),
      () => prisma.movimento.count({ where: { ...filtroMov, tipo: { in: [...SAIDAS] } } }),
      () => prisma.transferencia.count({ where: { ...filtroTrf, status: { in: ["RASCUNHO", "PENDENTE_ENVIO", "EM_TRANSITO", "AGUARDANDO_CONFERENCIA"] } } }),
      () => prisma.transferencia.count({ where: { ...filtroTrf, status: "DIVERGENTE" } }),
      () => prisma.transferencia.findMany({ where: filtroTrf, orderBy: { dataTransferencia: "desc" }, take: 5, include: { origem: true, destino: true, itens: true } }),
      () => prisma.fechamentoSemanal.findMany({ where: { unidadeId: { in: ids }, semanaInicio: { lte: hoje } }, orderBy: { semanaInicio: "desc" }, include: { unidade: true } }),
      () => emTransitoPorProduto(),
    ] as const);

  // situação do fechamento: semana mais recente iniciada por unidade + a anterior
  const fechPorUnidade = unidadesEscopo.map((u) => ({ unidade: u, semanas: fechamentos.filter((x) => x.unidadeId === u.id).slice(0, 2) }));
  const pendFech = fechPorUnidade.flatMap((x) => x.semanas.slice(1)).filter((s) => s.status !== "FECHADO").length;
  const itensTransito = [...transito.entries()].filter(([pid]) => !f.produto || pid === f.produto);
  const prodPorId = new Map(produtos.map((p) => [p.id, p]));

  return (
    <>
      <Cabecalho
        titulo="Painel"
        descricao={`${ctx.unidade ? ctx.unidade.nome : "Todas as unidades"} · ${formatarData(de)} a ${formatarData(ate)}`}
      />

      <Filtros>
        <Campo rotulo="De"><input type="date" name="de" defaultValue={f.de} className={estiloInput} /></Campo>
        <Campo rotulo="Até"><input type="date" name="ate" defaultValue={f.ate} className={estiloInput} /></Campo>
        <Campo rotulo="CNPJ">
          <select name="empresa" defaultValue={f.empresa ?? ""} className={estiloInput}>
            <option value="">Todos</option>
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.nomeFantasia} · {formatarCnpj(e.cnpj)}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Unidade">
          <select name="unidade" defaultValue={f.unidade ?? ""} className={estiloInput}>
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
        <Campo rotulo="Produto">
          <select name="produto" defaultValue={f.produto ?? ""} className={estiloInput}>
            <option value="">Todos</option>
            {produtos.map((p) => <option key={p.id} value={p.id}>{p.codigo} — {p.descricao}</option>)}
          </select>
        </Campo>
      </Filtros>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Indicador rotulo="Unidades" valor={totalUnidades} detalhe="cadastradas e ativas" icone={Building2} href="/empresas" />
        <Indicador rotulo="Produtos" valor={totalProdutos} detalhe="no catálogo central" icone={Package} href="/produtos" />
        <Indicador rotulo="Movimentações" valor={movs} detalhe="validadas no período" icone={Repeat} tom="info" />
        <Indicador rotulo="Entradas" valor={entradas} detalhe="no período" icone={ArrowDownToLine} tom="sucesso" href="/entradas" />
        <Indicador rotulo="Saídas" valor={saidas} detalhe="consumo e envios" icone={ArrowUpFromLine} tom="neutro" href="/consumo" />
        <Indicador rotulo="Transferências pendentes" valor={trfPendentes} detalhe="não concluídas" icone={Truck} tom={trfPendentes ? "alerta" : "neutro"} href="/transferencias" />
        <Indicador rotulo="Divergências" valor={divergentes} detalhe="aguardando análise" icone={AlertTriangle} tom={divergentes ? "perigo" : "neutro"} href="/transferencias?status=DIVERGENTE" />
        <Indicador rotulo="Fechamento semanal" valor={pendFech ? `${pendFech} pendente${pendFech > 1 ? "s" : ""}` : "Em dia"} detalhe="semana anterior" icone={CalendarCheck} tom={pendFech ? "alerta" : "sucesso"} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Cartao className="p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Transferências recentes</h2>
            <Link href="/transferencias" className="text-marca-600 text-sm hover:underline dark:text-marca-200">Ver todas</Link>
          </div>
          <ul className="borda divide-y divide-[var(--borda)]">
            {recentes.length === 0 && <li className="texto-suave py-4 text-sm">Nenhuma transferência.</li>}
            {recentes.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div>
                  <p className="font-medium">{t.codigo}</p>
                  <p className="texto-suave text-xs">{t.origem.nome} → {t.destino.nome} · {formatarData(t.dataTransferencia)} · {t.itens.length} {t.itens.length > 1 ? "itens" : "item"}</p>
                </div>
                <Selo tom={STATUS_TRF[t.status].tom}>{STATUS_TRF[t.status].rotulo}</Selo>
              </li>
            ))}
          </ul>
        </Cartao>

        <div className="flex flex-col gap-4">
          <Cartao className="p-4">
            <h2 className="mb-3 font-semibold">Estoque em trânsito</h2>
            {itensTransito.length === 0 ? <p className="texto-suave text-sm">Nada em trânsito.</p> : (
              <ul className="flex flex-col gap-2 text-sm">
                {itensTransito.map(([pid, q]) => (
                  <li key={pid} className="flex justify-between gap-2"><span className="truncate">{prodPorId.get(pid)?.codigo} · {prodPorId.get(pid)?.descricao}</span><b className="tabular-nums">{formatarQtd(q)}</b></li>
                ))}
              </ul>
            )}
          </Cartao>
          <Cartao className="p-4">
            <h2 className="mb-3 font-semibold">Fechamento semanal</h2>
            <ul className="flex flex-col gap-2 text-sm">
              {fechPorUnidade.map(({ unidade, semanas }) => (
                <li key={unidade.id}>
                  <p className="font-medium">{unidade.nome}</p>
                  {semanas.length === 0 && <p className="texto-suave text-xs">Sem fechamentos registrados</p>}
                  {semanas.map((s) => (
                    <p key={s.id} className="texto-suave flex justify-between text-xs">
                      <span>{formatarDia(s.semanaInicio)} – {formatarDia(s.semanaFim)}</span>
                      <Selo tom={s.status === "FECHADO" ? "sucesso" : s.status === "EM_CONFERENCIA" ? "alerta" : "neutro"}>
                        {s.status === "FECHADO" ? "Fechado" : s.status === "EM_CONFERENCIA" ? "Em conferência" : "Aberto"}
                      </Selo>
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          </Cartao>
        </div>
      </div>

      <h2 className="mt-8 mb-3 font-semibold">Atalhos</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {[
          ...ctx.usuario.unidades.map((u) => ({ href: `/estoque?unidade=${u.id}`, rotulo: `Estoque ${u.nome.replace("Paiol ", "")}`, icone: Warehouse })),
          { href: "/estoque/consolidado", rotulo: "Estoque consolidado", icone: Layers },
          { href: "/produtos", rotulo: "Cadastro de produtos", icone: Package },
          { href: "/entradas", rotulo: "Entradas", icone: ArrowDownToLine },
          { href: "/transferencias", rotulo: "Transferências", icone: ArrowLeftRight },
          { href: "/consumo", rotulo: "Consumo", icone: Flame },
          { href: "/producao", rotulo: "Produção", icone: Factory },
          { href: "/inventario", rotulo: "Inventário", icone: ClipboardList },
          { href: "/relatorios", rotulo: "Relatórios", icone: FileBarChart },
          { href: "/fechamento", rotulo: "Fechamento semanal", icone: CalendarCheck },
        ].map((a) => (
          <Link key={a.href} href={a.href} className="superficie flex items-center gap-2.5 rounded-xl border px-3 py-3 text-sm font-medium transition hover:shadow-md">
            <a.icone className="text-marca-500 size-4 shrink-0" /> {a.rotulo}
          </Link>
        ))}
      </div>
    </>
  );
}

/** Executa as consultas uma de cada vez: com pool de conexões pequeno (serverless), evita fila e tempo esgotado. */
async function emSequencia<T extends readonly (() => Promise<unknown>)[]>(fns: T): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const r: unknown[] = [];
  for (const fn of fns) r.push(await fn());
  return r as { [K in keyof T]: Awaited<ReturnType<T[K]>> };
}

export default async function Painel(props: { searchParams: Busca }) {
  try {
    return await PainelConteudo(props);
  } catch (e) {
    unstable_rethrow(e); // deixa passar redirect e sinais internos do Next
    return <ErroDiagnostico erro={e} />;
  }
}
