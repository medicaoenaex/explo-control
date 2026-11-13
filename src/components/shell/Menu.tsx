"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { MENU } from "@/lib/navegacao";

export function Menu({ aoNavegar }: { aoNavegar?: () => void }) {
  const caminho = usePathname();
  // item ativo = rota de menu mais específica que contém o caminho atual
  const melhor = MENU.flatMap((g) => g.itens.map((i) => i.href))
    .filter((h) => (h === "/" ? caminho === "/" : caminho === h || caminho.startsWith(h + "/")))
    .sort((a, b) => b.length - a.length)[0];
  const ativo = (href: string) => href === melhor;
  return (
    <nav className="flex flex-col gap-5 px-3 py-4">
      {MENU.map((g) => (
        <div key={g.titulo}>
          <p className="mb-1.5 px-2 text-[11px] font-semibold tracking-wider text-white/40 uppercase">{g.titulo}</p>
          <ul className="flex flex-col gap-0.5">
            {g.itens.map((i) => (
              <li key={i.href}>
                <Link
                  href={i.href}
                  onClick={aoNavegar}
                  className={clsx(
                    "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition",
                    ativo(i.href) ? "bg-white/10 font-medium text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <i.icone className={clsx("size-4", ativo(i.href) && "text-acento-400")} />
                  <span className="flex-1">{i.rotulo}</span>
                  {!i.pronto && <span className="rounded bg-white/10 px-1.5 text-[10px] text-white/50">em breve</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Marca() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="bg-acento-500 text-marca-900 grid size-8 place-items-center rounded-lg text-sm font-black">EX</span>
      <span className="leading-tight">
        <span className="block text-sm font-bold tracking-wide text-white">EXPLO CONTROL</span>
        <span className="block text-[10px] tracking-wider text-white/50 uppercase">Materiais controlados</span>
      </span>
    </Link>
  );
}
