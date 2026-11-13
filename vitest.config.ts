import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    fileParallelism: false,
    testTimeout: 30000,
    globalSetup: ["tests/setup-global.ts"],
    env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://explo:explo@localhost:5432/explo_control_test?schema=public" },
  },
});
