-- CreateTable
CREATE TABLE "SaldoSicoex" (
    "id" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "saldo" DECIMAL(18,3) NOT NULL,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoPorId" TEXT NOT NULL,

    CONSTRAINT "SaldoSicoex_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SaldoSicoex_data_idx" ON "SaldoSicoex"("data");

-- CreateIndex
CREATE UNIQUE INDEX "SaldoSicoex_unidadeId_produtoId_data_key" ON "SaldoSicoex"("unidadeId", "produtoId", "data");

-- AddForeignKey
ALTER TABLE "SaldoSicoex" ADD CONSTRAINT "SaldoSicoex_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaldoSicoex" ADD CONSTRAINT "SaldoSicoex_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaldoSicoex" ADD CONSTRAINT "SaldoSicoex_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

