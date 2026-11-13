"use client";
import { useActionState } from "react";
import { loginAction } from "./acoes";

export function FormLogin() {
  const [estado, acao, enviando] = useActionState(loginAction, undefined);
  const input = "superficie w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-marca-500/40";
  return (
    <form action={acao} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium">E-mail
        <input name="email" type="email" autoComplete="username" required className={input} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">Senha
        <input name="senha" type="password" autoComplete="current-password" required className={input} />
      </label>
      {estado?.erro && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{estado.erro}</p>}
      <button disabled={enviando} className="bg-marca-700 hover:bg-marca-800 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
