"use client";
import { useState } from "react";
import { Menu as IconeMenu, X } from "lucide-react";
import { Marca, Menu } from "./Menu";

export function MenuMovel() {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button onClick={() => setAberto(true)} className="rounded-lg p-2 hover:bg-black/5 lg:hidden" aria-label="Abrir menu">
        <IconeMenu className="size-5" />
      </button>
      {aberto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAberto(false)} />
          <aside className="bg-marca-900 absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <Marca />
              <button onClick={() => setAberto(false)} className="rounded p-1 text-white/70 hover:text-white" aria-label="Fechar menu"><X className="size-5" /></button>
            </div>
            <Menu aoNavegar={() => setAberto(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
