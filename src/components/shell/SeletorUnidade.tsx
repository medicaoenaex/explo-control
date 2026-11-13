"use client";
import { Building } from "lucide-react";

export function SeletorUnidade({ unidades, atual, acao }: { unidades: { id: string; nome: string }[]; atual: string; acao: (f: FormData) => Promise<void> }) {
  return (
    <form action={acao} className="relative flex items-center">
      <Building className="texto-suave pointer-events-none absolute left-2.5 size-4" />
      <select
        name="unidade"
        defaultValue={atual}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="superficie max-w-44 rounded-lg border py-2 pr-2 pl-8 text-sm font-medium sm:max-w-none"
        aria-label="Unidade selecionada"
      >
        <option value="">Todas as unidades</option>
        {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
      </select>
    </form>
  );
}
