"use client";
import { useActionState } from "react";
import { registrarSicoexAction } from "./acoes";
import { estiloInput } from "@/components/ui";

type Opcao = { valor: string; rotulo: string; unidade: string };

export function FormSicoex({ opcoes, hoje }: { opcoes: Opcao[]; hoje: string }) {
  const [estado, acao, enviando] = useActionState(registrarSicoexAction, undefined);
  const unidades = [...new Set(opcoes.map((o) => o.unidade))];
  const rotulo = "flex flex-col gap-1.5 text-xs font-medium";
  const input = `${estiloInput} w-full`;
  return (
    <form action={acao} className="superficie grid gap-3 rounded-xl border p-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
      <label className={rotulo}>Paiol e produto
        <select name="vinculo" required defaultValue="" className={input}>
          <option value="" disabled>Escolha…</option>
          {unidades.map((un) => (
            <optgroup key={un} label={un}>
              {opcoes.filter((o) => o.unidade === un).map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
            </optgroup>
          ))}
        </select>
      </label>
      <label className={rotulo}>Data do desmonte (lançamento no Sicoex)
        <input name="data" type="date" required defaultValue={hoje} max={hoje} className={input} />
      </label>
      <label className={rotulo}>Saldo no Sicoex
        <input name="saldo" required inputMode="decimal" placeholder="Ex.: 1.250,5" className={input} />
      </label>
      <button disabled={enviando} className="bg-marca-700 hover:bg-marca-800 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {enviando ? "Salvando…" : "Registrar"}
      </button>
      <label className={`${rotulo} sm:col-span-4`}>Observação (opcional)
        <input name="observacoes" maxLength={500} className={input} />
      </label>
      {estado?.erro && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-4 dark:bg-red-950 dark:text-red-300">{estado.erro}</p>}
    </form>
  );
}
