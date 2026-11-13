-- CreateEnum
CREATE TYPE "Situacao" AS ENUM ('ATIVO', 'INATIVO');

-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('ADMIN', 'GESTOR', 'OPERADOR', 'CONSULTA');

-- CreateEnum
CREATE TYPE "ClassificacaoProduto" AS ENUM ('EXPLOSIVO', 'ACESSORIO_EXPLOSIVO', 'INSUMO_PRODUCAO', 'MATERIAL_GERAL');

-- CreateEnum
CREATE TYPE "TipoMovimento" AS ENUM ('ENTRADA', 'CONSUMO', 'TRANSFERENCIA_SAIDA', 'TRANSFERENCIA_ENTRADA', 'TRANSFERENCIA_RETORNO', 'TRANSFERENCIA_SOBRA', 'PRODUCAO_ENTRADA', 'PRODUCAO_CONSUMO', 'AJUSTE_INVENTARIO');

-- CreateEnum
CREATE TYPE "StatusMovimento" AS ENUM ('PENDENTE', 'VALIDADO', 'REJEITADO', 'ESTORNADO');

-- CreateEnum
CREATE TYPE "StatusTransferencia" AS ENUM ('RASCUNHO', 'PENDENTE_ENVIO', 'EM_TRANSITO', 'AGUARDANDO_CONFERENCIA', 'RECEBIDA', 'DIVERGENTE', 'CANCELADA');

-- CreateEnum
CREATE TYPE "ResolucaoDivergencia" AS ENUM ('AJUSTE_APROVADO', 'RETORNO_ORIGEM');

-- CreateEnum
CREATE TYPE "StatusFechamento" AS ENUM ('ABERTO', 'EM_CONFERENCIA', 'FECHADO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL DEFAULT 'CONSULTA',
    "situacao" "Situacao" NOT NULL DEFAULT 'ATIVO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoLogin" TIMESTAMP(3),

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sessao" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "Sessao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcessoUnidade" (
    "usuarioId" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,

    CONSTRAINT "AcessoUnidade_pkey" PRIMARY KEY ("usuarioId","unidadeId")
);

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "situacao" "Situacao" NOT NULL DEFAULT 'ATIVO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "demonstracao" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unidade" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sigla" TEXT NOT NULL,
    "descricao" TEXT,
    "situacao" "Situacao" NOT NULL DEFAULT 'ATIVO',
    "realizaProducao" BOOLEAN NOT NULL DEFAULT false,
    "empresaId" TEXT NOT NULL,
    "responsavelId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "demonstracao" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Unidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnidadeMedida" (
    "id" TEXT NOT NULL,
    "sigla" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "casasDecimais" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "UnidadeMedida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produto" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "unidadeMedidaId" TEXT NOT NULL,
    "classificacao" "ClassificacaoProduto" NOT NULL,
    "controlaLote" BOOLEAN NOT NULL DEFAULT false,
    "situacao" "Situacao" NOT NULL DEFAULT 'ATIVO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoPorId" TEXT NOT NULL,
    "demonstracao" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProdutoUnidade" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "codigoLocal" TEXT NOT NULL,
    "situacao" "Situacao" NOT NULL DEFAULT 'ATIVO',
    "associadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "associadoPorId" TEXT NOT NULL,

    CONSTRAINT "ProdutoUnidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lote" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "fabricacao" TIMESTAMP(3),
    "validade" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movimento" (
    "id" TEXT NOT NULL,
    "tipo" "TipoMovimento" NOT NULL,
    "status" "StatusMovimento" NOT NULL DEFAULT 'PENDENTE',
    "produtoUnidadeId" TEXT NOT NULL,
    "loteId" TEXT,
    "quantidade" DECIMAL(18,3) NOT NULL,
    "dataMovimento" TIMESTAMP(3) NOT NULL,
    "documento" TEXT,
    "fornecedor" TEXT,
    "observacoes" TEXT,
    "transferenciaItemId" TEXT,
    "chaveIdempotencia" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoPorId" TEXT NOT NULL,
    "validadoEm" TIMESTAMP(3),
    "validadoPorId" TEXT,
    "demonstracao" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Movimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transferencia" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "status" "StatusTransferencia" NOT NULL DEFAULT 'RASCUNHO',
    "origemId" TEXT NOT NULL,
    "destinoId" TEXT NOT NULL,
    "cnpjOrigem" TEXT NOT NULL,
    "cnpjDestino" TEXT NOT NULL,
    "documento" TEXT,
    "observacoes" TEXT,
    "dataTransferencia" TIMESTAMP(3) NOT NULL,
    "criadoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviadoPorId" TEXT,
    "enviadoEm" TIMESTAMP(3),
    "recebidoPorId" TEXT,
    "recebidoEm" TIMESTAMP(3),
    "canceladoEm" TIMESTAMP(3),
    "demonstracao" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Transferencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferenciaItem" (
    "id" TEXT NOT NULL,
    "transferenciaId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "loteId" TEXT,
    "quantidadeEnviada" DECIMAL(18,3) NOT NULL,
    "quantidadeRecebida" DECIMAL(18,3),
    "resolucao" "ResolucaoDivergencia",
    "justificativa" TEXT,
    "aprovadoPorId" TEXT,
    "aprovadoEm" TIMESTAMP(3),

    CONSTRAINT "TransferenciaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FechamentoSemanal" (
    "id" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "semanaInicio" DATE NOT NULL,
    "semanaFim" DATE NOT NULL,
    "status" "StatusFechamento" NOT NULL DEFAULT 'ABERTO',
    "fechadoEm" TIMESTAMP(3),
    "fechadoPorId" TEXT,

    CONSTRAINT "FechamentoSemanal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT NOT NULL,
    "dados" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Sessao_tokenHash_key" ON "Sessao"("tokenHash");

-- CreateIndex
CREATE INDEX "Sessao_usuarioId_idx" ON "Sessao"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_cnpj_key" ON "Empresa"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Unidade_nome_key" ON "Unidade"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Unidade_sigla_key" ON "Unidade"("sigla");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nome_key" ON "Categoria"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "UnidadeMedida_sigla_key" ON "UnidadeMedida"("sigla");

-- CreateIndex
CREATE UNIQUE INDEX "Produto_codigo_key" ON "Produto"("codigo");

-- CreateIndex
CREATE INDEX "Produto_descricao_idx" ON "Produto"("descricao");

-- CreateIndex
CREATE UNIQUE INDEX "ProdutoUnidade_produtoId_unidadeId_key" ON "ProdutoUnidade"("produtoId", "unidadeId");

-- CreateIndex
CREATE UNIQUE INDEX "ProdutoUnidade_unidadeId_codigoLocal_key" ON "ProdutoUnidade"("unidadeId", "codigoLocal");

-- CreateIndex
CREATE UNIQUE INDEX "Lote_produtoId_numero_key" ON "Lote"("produtoId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Movimento_chaveIdempotencia_key" ON "Movimento"("chaveIdempotencia");

-- CreateIndex
CREATE INDEX "Movimento_produtoUnidadeId_status_idx" ON "Movimento"("produtoUnidadeId", "status");

-- CreateIndex
CREATE INDEX "Movimento_dataMovimento_idx" ON "Movimento"("dataMovimento");

-- CreateIndex
CREATE INDEX "Movimento_documento_idx" ON "Movimento"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "Transferencia_codigo_key" ON "Transferencia"("codigo");

-- CreateIndex
CREATE INDEX "Transferencia_status_idx" ON "Transferencia"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FechamentoSemanal_unidadeId_semanaInicio_key" ON "FechamentoSemanal"("unidadeId", "semanaInicio");

-- CreateIndex
CREATE INDEX "Auditoria_entidade_entidadeId_idx" ON "Auditoria"("entidade", "entidadeId");

-- CreateIndex
CREATE INDEX "Auditoria_criadoEm_idx" ON "Auditoria"("criadoEm");

-- AddForeignKey
ALTER TABLE "Sessao" ADD CONSTRAINT "Sessao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcessoUnidade" ADD CONSTRAINT "AcessoUnidade_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcessoUnidade" ADD CONSTRAINT "AcessoUnidade_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unidade" ADD CONSTRAINT "Unidade_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unidade" ADD CONSTRAINT "Unidade_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_unidadeMedidaId_fkey" FOREIGN KEY ("unidadeMedidaId") REFERENCES "UnidadeMedida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdutoUnidade" ADD CONSTRAINT "ProdutoUnidade_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdutoUnidade" ADD CONSTRAINT "ProdutoUnidade_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdutoUnidade" ADD CONSTRAINT "ProdutoUnidade_associadoPorId_fkey" FOREIGN KEY ("associadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimento" ADD CONSTRAINT "Movimento_produtoUnidadeId_fkey" FOREIGN KEY ("produtoUnidadeId") REFERENCES "ProdutoUnidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimento" ADD CONSTRAINT "Movimento_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimento" ADD CONSTRAINT "Movimento_transferenciaItemId_fkey" FOREIGN KEY ("transferenciaItemId") REFERENCES "TransferenciaItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimento" ADD CONSTRAINT "Movimento_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimento" ADD CONSTRAINT "Movimento_validadoPorId_fkey" FOREIGN KEY ("validadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transferencia" ADD CONSTRAINT "Transferencia_origemId_fkey" FOREIGN KEY ("origemId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transferencia" ADD CONSTRAINT "Transferencia_destinoId_fkey" FOREIGN KEY ("destinoId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transferencia" ADD CONSTRAINT "Transferencia_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transferencia" ADD CONSTRAINT "Transferencia_enviadoPorId_fkey" FOREIGN KEY ("enviadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transferencia" ADD CONSTRAINT "Transferencia_recebidoPorId_fkey" FOREIGN KEY ("recebidoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferenciaItem" ADD CONSTRAINT "TransferenciaItem_transferenciaId_fkey" FOREIGN KEY ("transferenciaId") REFERENCES "Transferencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferenciaItem" ADD CONSTRAINT "TransferenciaItem_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferenciaItem" ADD CONSTRAINT "TransferenciaItem_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferenciaItem" ADD CONSTRAINT "TransferenciaItem_aprovadoPorId_fkey" FOREIGN KEY ("aprovadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FechamentoSemanal" ADD CONSTRAINT "FechamentoSemanal_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ───── Regras de integridade reforçadas no próprio banco (além da aplicação) ─────
ALTER TABLE "Transferencia" ADD CONSTRAINT "trf_origem_diferente_destino" CHECK ("origemId" <> "destinoId");
ALTER TABLE "TransferenciaItem" ADD CONSTRAINT "trf_item_qtd_positiva" CHECK ("quantidadeEnviada" > 0);
ALTER TABLE "TransferenciaItem" ADD CONSTRAINT "trf_item_qtd_recebida_valida" CHECK ("quantidadeRecebida" IS NULL OR "quantidadeRecebida" >= 0);
ALTER TABLE "Movimento" ADD CONSTRAINT "mov_qtd_nao_zero" CHECK ("quantidade" <> 0);
ALTER TABLE "Movimento" ADD CONSTRAINT "mov_sinal_por_tipo" CHECK (
  ("tipo" IN ('ENTRADA','TRANSFERENCIA_ENTRADA','TRANSFERENCIA_RETORNO','TRANSFERENCIA_SOBRA','PRODUCAO_ENTRADA') AND "quantidade" > 0)
  OR ("tipo" IN ('CONSUMO','TRANSFERENCIA_SAIDA','PRODUCAO_CONSUMO') AND "quantidade" < 0)
  OR ("tipo" = 'AJUSTE_INVENTARIO')
);

-- Trilha de auditoria é somente inserção
CREATE OR REPLACE FUNCTION auditoria_imutavel() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'A trilha de auditoria não pode ser alterada ou excluída'; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER auditoria_sem_update BEFORE UPDATE OR DELETE ON "Auditoria"
  FOR EACH ROW EXECUTE FUNCTION auditoria_imutavel();
