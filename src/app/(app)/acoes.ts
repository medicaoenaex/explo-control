"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sair } from "@/server/auth";
import { COOKIE_UNIDADE } from "@/server/contexto";

export async function trocarUnidade(formData: FormData) {
  const id = String(formData.get("unidade") ?? "");
  const jar = await cookies();
  if (id) jar.set(COOKIE_UNIDADE, id, { httpOnly: true, sameSite: "lax", path: "/" });
  else jar.delete(COOKIE_UNIDADE);
  revalidatePath("/", "layout");
}

export async function sairAction() {
  await sair();
  redirect("/login");
}
