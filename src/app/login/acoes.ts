"use server";
import { redirect } from "next/navigation";
import { entrar } from "@/server/auth";
import { loginSchema } from "@/lib/validacao";

export async function loginAction(_: { erro?: string } | undefined, formData: FormData) {
  const dados = loginSchema.safeParse({ email: formData.get("email"), senha: formData.get("senha") });
  if (!dados.success) return { erro: dados.error.issues[0].message };
  const r = await entrar(dados.data.email, dados.data.senha);
  if (!r.ok) return { erro: r.erro };
  redirect("/");
}
