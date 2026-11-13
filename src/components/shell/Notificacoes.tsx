"use client";
import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

export function Notificacoes({ total, itens }: { total: number; itens: { rotulo: string; n: number; href: string }[] }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setAberto((a) => !a)} className="relative rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/5" aria-label={`Pendências: ${total}`}>
        <Bell className="size-5" />
        {total > 0 && <span className="bg-acento-500 text-marca-900 absolute -top-0.5 -right-0.5 grid min-w-4.5 place-items-center rounded-full px-1 text-[10px] font-bold">{total}</span>}
      </button>
      {aberto && (
        <div className="superficie absolute right-0 z-40 mt-2 w-72 rounded-xl border p-2 shadow-lg">
          <p className="texto-suave px-2 py-1 text-xs font-semibold uppercase">Pendências</p>
          {itens.map((i) => (
            <Link key={i.rotulo} href={i.href} onClick={() => setAberto(false)} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-black/[0.04] dark:hover:bg-white/5">
              <span>{i.rotulo}</span>
              <span className={i.n ? "bg-acento-500/15 text-acento-600 rounded px-1.5 font-semibold" : "texto-suave"}>{i.n}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
