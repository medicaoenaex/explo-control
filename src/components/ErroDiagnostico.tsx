import { AlertTriangle } from "lucide-react";
import { Cartao } from "@/components/ui";

/** Mostra o erro técnico na tela (sem credenciais) para facilitar o suporte durante a implantação. */
export function ErroDiagnostico({ erro }: { erro: unknown }) {
  const e = erro as { name?: string; code?: string; message?: string };
  const texto = `${e?.name ?? "Erro"}${e?.code ? ` [${e.code}]` : ""}\n${e?.message ?? String(erro)}`
    .replace(/postgres(ql)?:\/\/[^\s"']+/gi, "postgresql://***")
    .slice(0, 3000);
  console.error(erro);
  return (
    <Cartao className="p-5">
      <p className="mb-2 flex items-center gap-2 font-semibold text-red-700 dark:text-red-400"><AlertTriangle className="size-5" /> Não foi possível carregar esta tela</p>
      <p className="texto-suave mb-3 text-sm">Copie o texto abaixo e envie ao suporte.</p>
      <pre className="borda overflow-x-auto rounded-lg border bg-black/[0.03] p-3 text-xs whitespace-pre-wrap">{texto}</pre>
    </Cartao>
  );
}
