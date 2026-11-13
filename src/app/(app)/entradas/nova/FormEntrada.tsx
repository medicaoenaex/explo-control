"use client";
import { useActionState } from "react";
import { registrarEntradaAction } from "../acoes";
import { estiloInput } from "@/components/ui";

type Opcao = { valor: string; rotulo: string; unidade: string; lote: boolean };

export function FormEntrada({ opcoes, hoje }: { opcoes: Opcao[]; hoje: string }) {
  const [estado, acao, enviando] = useActionState(registrarEntradaAction, undefined);
  const unidades = [...new Set(opcoes.map((o) => o.unidade))];
  const rotulo = "flex flex-col gap-1.5 text-sm font-medium";
  const input = `${estiloInput} w-full`;
  return (
    <form action={acao} className="superficie grid gap-4 rounded-xl border p-4 sm:grid-cols-2 sm:p-6">
      <label className={`${rotulo} sm:col-span-2`}>Produto e unidade *
        <select name="vinculo" required defaultValue="" className={input}>
          <option value="" disabled>Escolha…</option>
          {unidades.map((un) => (
            <optgroup key={un} label={un}>
              {opcoes.filter((o) => o.unidade === un).map((o) => (
                <option key={o.valor} value={o.valor}>{o.rotulo}{o.lote ? " (exige lote)" : ""}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label className={rotulo}>Quantidade *
        <input name="quantidade" required inputMode="decimal" placeholder="Ex.: 1.250,5" className={input} />
      </label>
      <label className={rotulo}>Data da entrada *
        <input name="data" type="date" required defaultValue={hoje} max={hoje} className={input} />
      </label>
      <label className={rotulo}>Nota fiscal / documento
        <input name="documento" maxLength={60} className={input} />
      </label>
      <label className={rotulo}>Lote
        <input name="lote" maxLength={40} placeholder="Obrigatório se o produto exigir" className={input} />
      </label>
      <label className={`${rotulo} sm:col-span-2`}>Fornecedor
        <input name="fornecedor" maxLength={120} className={input} />
      </label>
      <label className={`${rotulo} sm:col-span-2`}>Observações
        <textarea name="observacoes" rows={3} maxLength={1000} className={input} />
      </label>
      {estado?.erro && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2 dark:bg-red-950 dark:text-red-300">{estado.erro}</p>
      )}
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={enviando} className="bg-marca-700 hover:bg-marca-800 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {enviando ? "Salvando…" : "Registrar entrada"}
        </button>
        <p className="texto-suave text-xs">A entrada fica pendente e só soma no estoque depois de validada.</p>
      </div>
    </form>
  );
}
