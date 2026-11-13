"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { exigirUsuario } from "@/server/auth";
import { transferirDireto } from "@/server/estoque";
import { RegraNegocioError } from "@/lib/erros";

export type EstadoForm = { erro?: string } | undefined;

const texto = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
};
/** "1.250,5" → "1250.5"; "1250.5" fica como está. */
const numeroBr = (v?: string) => (v?.includes(",") ? v.replace(/\./g, "").replace(",", ".") : (v ?? ""));

/** Transfere e já credita no paiol de destino. */
export async function transferirAction(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await exigirUsuario();
  let itens: { produtoId: string; loteNumero?: string; quantidade: string }[] = [];
  try {
    itens = JSON.parse(texto(fd, "itens") ?? "[]");
  } catch {
    return { erro: "Itens inválidos." };
  }
  itens = itens.filter((i) => i.produtoId);
  if (itens.length === 0) return { erro: "Inclua ao menos um produto." };
  let codigo: string;
  try {
    const t = await transferirDireto(
      {
        origemId: texto(fd, "origemId") ?? "",
        destinoId: texto(fd, "destinoId") ?? "",
        dataTransferencia: new Date(`${texto(fd, "data")}T12:00:00-03:00`),
        documento: texto(fd, "documento"),
        observacoes: texto(fd, "observacoes"),
        itens: itens.map((i) => ({ produtoId: i.produtoId, loteNumero: i.loteNumero?.trim() || undefined, quantidade: numeroBr(i.quantidade) as unknown as number })),
      },
      u.ator,
    );
    codigo = t.codigo;
  } catch (e) {
    if (e instanceof RegraNegocioError) return { erro: e.message };
    if (e instanceof ZodError) return { erro: e.issues[0]?.message ?? "Dados inválidos." };
    console.error(e);
    return { erro: "Não foi possível salvar. Tente novamente." };
  }
  revalidatePath("/", "layout");
  redirect(`/transferencias?feita=${encodeURIComponent(codigo)}`);
}
