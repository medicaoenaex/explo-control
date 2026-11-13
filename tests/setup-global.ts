import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const URL_TESTE = process.env.TEST_DATABASE_URL ?? "postgresql://explo:explo@localhost:5432/explo_control_test?schema=public";

/** Aplica as migrações no banco de TESTE e limpa as tabelas antes da execução. */
export default async function setup() {
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: URL_TESTE }, stdio: "ignore" });
  const db = new PrismaClient({ datasourceUrl: URL_TESTE });
  const tabelas = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(`TRUNCATE ${tabelas.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
  await db.$disconnect();
}
