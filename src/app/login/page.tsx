import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { usuarioAtual } from "@/server/auth";
import { prisma } from "@/lib/db";
import { FormLogin } from "./FormLogin";

export const metadata = { title: "Entrar" };

export default async function PaginaLogin() {
  if (await usuarioAtual()) redirect("/");
  const demo = (await prisma.empresa.count({ where: { demonstracao: true } })) > 0;
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="bg-marca-900 relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="bg-acento-500 text-marca-900 grid size-10 place-items-center rounded-lg font-black">EX</span>
          <span className="text-lg font-bold tracking-wide">EXPLO CONTROL</span>
        </div>
        <div>
          <h2 className="text-3xl leading-tight font-semibold">Estoque, transferências e rastreabilidade de materiais controlados em um só lugar.</h2>
          <p className="mt-4 max-w-md text-white/60">Saldos calculados a partir de movimentações validadas, com histórico completo e visão consolidada do grupo.</p>
        </div>
        <p className="flex items-center gap-2 text-xs text-white/40"><ShieldCheck className="size-4" /> Acesso restrito a usuários autorizados</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="bg-marca-900 text-acento-400 inline-grid size-10 place-items-center rounded-lg font-black">EX</span>
          </div>
          <h1 className="text-2xl font-semibold">Entrar</h1>
          <p className="texto-suave mt-1 mb-6 text-sm">Use suas credenciais corporativas.</p>
          <FormLogin />
          {demo && <p className="texto-suave mt-6 rounded-lg border border-dashed p-3 text-xs">
            Demonstração: <b>admin@demo.explo</b> · senha <b>Demo@2026</b>
          </p>}
        </div>
      </div>
    </div>
  );
}
