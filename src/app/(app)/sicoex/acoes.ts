"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { exigirUsuario } from "@/server/auth";
import { registrarSaldoSicoex } from "@/server/sicoex";
import { RegraNegocioError } from "@/lib/erros";

export type EstadoForm = { erro?: string } | undefined;
const texto = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
};
const numeroBr = (v?: string) => (v?.includes(",") ? v.replace(/\./g, "").replace(",", ".") : (v ?? ""));

export async function registrarSicoexAction(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await exigirUsuario();
  const [unidadeId, produtoId] = (texto(fd, "vinculo") ?? "|").split("|");
  if (!unidadeId || !produtoId) return { erro: "Escolha o produto." };
  try {
    await registrarSaldoSicoex(
      { unidadeId, produtoId, data: texto(fd, "data") ?? "", saldo: numeroBr(texto(fd, "saldo")) as unknown as number, observacoes: texto(fd, "observacoes") },
      u.ator,
    );
  } catch (e) {
    if (e instanceof RegraNegocioError) return { erro: e.message };
    if (e instanceof ZodError) return { erro: e.issues[0]?.message ?? "Dados inválidos." };
    console.error(e);
    return { erro: "Não foi possível salvar. Tente novamente." };
  }
  revalidatePath("/sicoex");
  redirect("/sicoex?salvo=1");
}
