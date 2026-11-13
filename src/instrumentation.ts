import type { Instrumentation } from "next";

/** Guarda erros de servidor na auditoria para a página /diagnostico mostrar a mensagem real. */
export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { prisma } = await import("@/lib/db");
    const e = err as { message?: string; stack?: string; digest?: string; code?: string };
    await prisma.auditoria.create({
      data: {
        acao: "ERRO_SERVIDOR",
        entidade: request.path.slice(0, 200),
        entidadeId: String(e.digest ?? "-"),
        dados: { codigo: e.code ?? null, mensagem: String(e.message ?? err).slice(0, 4000), pilha: String(e.stack ?? "").slice(0, 3000) },
      },
    });
  } catch {
    // sem banco não há onde registrar
  }
};
