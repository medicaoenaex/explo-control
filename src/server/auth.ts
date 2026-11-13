import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { Ator } from "./permissoes";

export const COOKIE_SESSAO = "explo_sessao";
const DURACAO_MS = 8 * 60 * 60 * 1000; // 8 horas (um turno)

const HASH_FALSO = bcrypt.hashSync("senha-inexistente", 12);
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

// Proteção simples contra força bruta (por processo). Em produção, mover para o banco/Redis.
const falhas = new Map<string, { n: number; ate: number }>();

export async function entrar(email: string, senha: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  const bloqueio = falhas.get(email);
  if (bloqueio && bloqueio.n >= 5 && bloqueio.ate > Date.now())
    return { ok: false, erro: "Muitas tentativas. Aguarde alguns minutos e tente novamente." };

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  // compara mesmo se o usuário não existir, para não revelar quais e-mails existem
  const ok = await bcrypt.compare(senha, usuario?.senhaHash ?? HASH_FALSO);
  if (!usuario || !ok || usuario.situacao !== "ATIVO") {
    const f = falhas.get(email) ?? { n: 0, ate: 0 };
    falhas.set(email, { n: f.n + 1, ate: Date.now() + 10 * 60 * 1000 });
    return { ok: false, erro: "E-mail ou senha incorretos." };
  }
  falhas.delete(email);

  const token = randomBytes(32).toString("base64url");
  const h = await headers();
  await prisma.$transaction([
    prisma.sessao.create({
      data: {
        tokenHash: hash(token),
        usuarioId: usuario.id,
        expiraEm: new Date(Date.now() + DURACAO_MS),
        ip: h.get("x-forwarded-for")?.split(",")[0]?.trim(),
        userAgent: h.get("user-agent")?.slice(0, 300),
      },
    }),
    prisma.usuario.update({ where: { id: usuario.id }, data: { ultimoLogin: new Date() } }),
    prisma.auditoria.create({ data: { usuarioId: usuario.id, acao: "LOGIN", entidade: "Usuario", entidadeId: usuario.id } }),
  ]);
  (await cookies()).set(COOKIE_SESSAO, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO_MS / 1000,
  });
  return { ok: true };
}

export async function sair() {
  const jar = await cookies();
  const token = jar.get(COOKIE_SESSAO)?.value;
  if (token) await prisma.sessao.deleteMany({ where: { tokenHash: hash(token) } });
  jar.delete(COOKIE_SESSAO);
}

/** Usuário da requisição atual (memorizado por requisição). */
export const usuarioAtual = cache(async () => {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token) return null;
  const sessao = await prisma.sessao.findUnique({
    where: { tokenHash: hash(token) },
    include: { usuario: { include: { acessos: { include: { unidade: true } } } } },
  });
  if (!sessao || sessao.expiraEm < new Date() || sessao.usuario.situacao !== "ATIVO") return null;
  const u = sessao.usuario;
  const unidades =
    u.perfil === "ADMIN"
      ? await prisma.unidade.findMany({ where: { situacao: "ATIVO" }, orderBy: { nome: "asc" } })
      : u.acessos.map((a) => a.unidade).filter((x) => x.situacao === "ATIVO");
  const ator: Ator = { id: u.id, perfil: u.perfil, unidadeIds: unidades.map((x) => x.id) };
  return { id: u.id, nome: u.nome, email: u.email, perfil: u.perfil, unidades, ator };
});

export async function exigirUsuario() {
  const u = await usuarioAtual();
  if (!u) redirect("/login");
  return u;
}
