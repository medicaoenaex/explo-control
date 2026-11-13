"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { exigirUsuario } from "@/server/auth";
import { registrarLancamento, validarLancamento } from "@/server/estoque";
import { RegraNegocioError } from "@/lib/erros";

export type EstadoForm = { erro?: string } | undefined;

const texto = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
};

/** "1.250,5" → "1250.5"; "1250.5" fica como está. */
const numeroBr = (v?: string) => (v?.includes(",") ? v.replace(/\./g, "").replace(",", ".") : (v ?? ""));

function mensagem(e: unknown): string {
  if (e instanceof RegraNegocioError) return e.message;
  if (e instanceof ZodError) return e.issues[0]?.message ?? "Dados inválidos.";
  console.error(e);
  return "Não foi possível salvar. Tente novamente.";
}

/** Registra uma entrada (fica pendente de validação). */
export async function registrarEntradaAction(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await exigirUsuario();
  const [unidadeId, produtoId] = (texto(fd, "vinculo") ?? "|").split("|");
  if (!unidadeId || !produtoId) return { erro: "Escolha o produto." };
  try {
    await registrarLancamento(
      {
        tipo: "ENTRADA",
        unidadeId,
        produtoId,
        quantidade: numeroBr(texto(fd, "quantidade")) as unknown as number,
        dataMovimento: new Date(`${texto(fd, "data")}T12:00:00-03:00`),
        loteNumero: texto(fd, "lote"),
        documento: texto(fd, "documento"),
        fornecedor: texto(fd, "fornecedor"),
        observacoes: texto(fd, "observacoes"),
      },
      u.ator,
    );
  } catch (e) {
    return { erro: mensagem(e) };
  }
  revalidatePath("/", "layout");
  redirect("/entradas?registrada=1");
}

/** Valida um lançamento pendente: a partir daqui ele entra no saldo. */
export async function validarAction(fd: FormData) {
  const u = await exigirUsuario();
  const id = texto(fd, "id");
  let erro: string | undefined;
  if (id) {
    try {
      await validarLancamento(id, u.ator);
    } catch (e) {
      erro = mensagem(e);
    }
  }
  revalidatePath("/", "layout");
  redirect(erro ? `/entradas?erro=${encodeURIComponent(erro)}` : "/entradas?validada=1");
}
