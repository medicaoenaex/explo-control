import clsx from "clsx";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function Cartao({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx("superficie rounded-xl border shadow-sm", className)}>{children}</div>;
}

export function Cabecalho({ titulo, descricao, acoes }: { titulo: string; descricao?: string; acoes?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{titulo}</h1>
        {descricao && <p className="texto-suave mt-1 text-sm">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}

const TONS = {
  neutro: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  sucesso: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  alerta: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  perigo: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  info: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
} as const;
export type Tom = keyof typeof TONS;

export function Selo({ tom = "neutro", children }: { tom?: Tom; children: React.ReactNode }) {
  return <span className={clsx("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap", TONS[tom])}>{children}</span>;
}

export function Indicador({ rotulo, valor, detalhe, icone: Icone, tom = "neutro", href }: {
  rotulo: string; valor: React.ReactNode; detalhe?: string; icone: LucideIcon; tom?: Tom; href?: string;
}) {
  const corpo = (
    <Cartao className="h-full p-4 transition hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <p className="texto-suave text-xs font-medium tracking-wide uppercase">{rotulo}</p>
        <span className={clsx("rounded-lg p-1.5", TONS[tom])}><Icone className="size-4" /></span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{valor}</p>
      {detalhe && <p className="texto-suave mt-1 text-xs">{detalhe}</p>}
    </Cartao>
  );
  return href ? <Link href={href} className="block h-full">{corpo}</Link> : corpo;
}

/** Tabela que vira lista de cartões no celular (cada célula leva seu rótulo). */
export function Tabela<T>({ colunas, linhas, chave, vazio = "Nenhum registro encontrado." }: {
  colunas: { titulo: string; celula: (l: T) => React.ReactNode; alinhar?: "direita"; ocultarMobile?: boolean }[];
  linhas: T[];
  chave: (l: T) => string;
  vazio?: string;
}) {
  if (linhas.length === 0) return <Cartao className="texto-suave p-8 text-center text-sm">{vazio}</Cartao>;
  return (
    <Cartao className="overflow-hidden">
      <table className="w-full text-sm">
        <thead className="hidden md:table-header-group">
          <tr className="borda border-b bg-black/[0.02] dark:bg-white/[0.02]">
            {colunas.map((c) => (
              <th key={c.titulo} className={clsx("texto-suave px-4 py-2.5 text-xs font-medium uppercase", c.alinhar === "direita" ? "text-right" : "text-left")}>{c.titulo}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={chave(l)} className="borda block border-b px-4 py-3 last:border-0 md:table-row md:p-0 hover:bg-black/[0.015] dark:hover:bg-white/[0.02]">
              {colunas.map((c) => (
                <td key={c.titulo} className={clsx(
                  "flex justify-between gap-4 py-0.5 md:table-cell md:px-4 md:py-2.5",
                  c.alinhar === "direita" && "md:text-right tabular-nums",
                  c.ocultarMobile && "hidden md:table-cell",
                )}>
                  <span className="texto-suave text-xs md:hidden">{c.titulo}</span>
                  <span>{c.celula(l)}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Cartao>
  );
}

export function Botao({ href, children, variante = "primario" }: { href: string; children: React.ReactNode; variante?: "primario" | "secundario" }) {
  return (
    <Link href={href} className={clsx(
      "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition",
      variante === "primario" ? "bg-marca-700 text-white hover:bg-marca-800" : "superficie border hover:bg-black/[0.03]",
    )}>{children}</Link>
  );
}

export function Filtros({ children }: { children: React.ReactNode }) {
  return <form className="superficie mb-4 flex flex-wrap items-end gap-3 rounded-xl border p-3">{children}
    <button className="bg-marca-700 hover:bg-marca-800 rounded-lg px-3.5 py-2 text-sm font-medium text-white">Filtrar</button>
  </form>;
}

export function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return <label className="flex min-w-36 flex-1 flex-col gap-1 text-xs sm:flex-none"><span className="texto-suave font-medium">{rotulo}</span>{children}</label>;
}

export const estiloInput = "superficie rounded-lg border px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-marca-500/40";
