import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Em hospedagem serverless com pool (Supabase/pgBouncer) a URL costuma vir com
 * connection_limit=1, o que estoura o tempo de espera quando uma página faz várias
 * consultas em paralelo (ex.: o painel). Garantimos um mínimo de 5 conexões e 20 s de espera.
 */
function urlBanco(): string | undefined {
  const bruta = process.env.DATABASE_URL;
  if (!bruta) return undefined;
  try {
    const u = new URL(bruta);
    if (Number(u.searchParams.get("connection_limit") ?? "5") < 5) u.searchParams.set("connection_limit", "5");
    if (!u.searchParams.has("pool_timeout")) u.searchParams.set("pool_timeout", "20");
    return u.toString();
  } catch {
    return bruta;
  }
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    datasourceUrl: urlBanco(),
    // banco remoto: dar folga às transações com trava (padrão do Prisma é 5 s)
    transactionOptions: { maxWait: 10_000, timeout: 30_000 },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
