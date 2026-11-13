import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { exigirUsuario } from "./auth";

export const COOKIE_UNIDADE = "explo_unidade";

/** Usuário + unidade selecionada no cabeçalho (null = todas as unidades permitidas). */
export async function contexto() {
  const usuario = await exigirUsuario();
  const escolhida = (await cookies()).get(COOKIE_UNIDADE)?.value;
  const unidade = usuario.unidades.find((u) => u.id === escolhida) ?? null;
  return { usuario, unidade, unidadeIds: unidade ? [unidade.id] : usuario.unidades.map((u) => u.id) };
}

/** Pendências que aparecem no sino de notificações. */
export async function pendencias(unidadeIds: string[]) {
  const [aReceber, divergentes, aEnviar, lancamentos] = await Promise.all([
    prisma.transferencia.count({ where: { destinoId: { in: unidadeIds }, status: { in: ["EM_TRANSITO", "AGUARDANDO_CONFERENCIA"] } } }),
    prisma.transferencia.count({ where: { OR: [{ destinoId: { in: unidadeIds } }, { origemId: { in: unidadeIds } }], status: "DIVERGENTE" } }),
    prisma.transferencia.count({ where: { origemId: { in: unidadeIds }, status: "PENDENTE_ENVIO" } }),
    prisma.movimento.count({ where: { status: "PENDENTE", produtoUnidade: { unidadeId: { in: unidadeIds } } } }),
  ]);
  return {
    total: aReceber + divergentes + aEnviar + lancamentos,
    itens: [
      { rotulo: "Transferências a receber", n: aReceber, href: "/transferencias?status=EM_TRANSITO" },
      { rotulo: "Transferências divergentes", n: divergentes, href: "/transferencias?status=DIVERGENTE" },
      { rotulo: "Transferências a enviar", n: aEnviar, href: "/transferencias?status=PENDENTE_ENVIO" },
      { rotulo: "Lançamentos a validar", n: lancamentos, href: "/entradas?status=PENDENTE" },
    ],
  };
}
