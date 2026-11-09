-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PerfilUsuario" AS ENUM ('ADMIN', 'ALMOXARIFE');

-- CreateEnum
CREATE TYPE "StatusColaborador" AS ENUM ('ATIVO', 'INATIVO', 'DESLIGADO');

-- CreateEnum
CREATE TYPE "StatusDevolucao" AS ENUM ('EM_USO', 'DEVOLVIDO', 'TROCADO', 'PERDIDO');

-- CreateEnum
CREATE TYPE "TipoMovimentacao" AS ENUM ('ENTRADA', 'SAIDA', 'DEVOLUCAO', 'AJUSTE');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "senhaHash" VARCHAR(255) NOT NULL,
    "perfil" "PerfilUsuario" NOT NULL DEFAULT 'ALMOXARIFE',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoAcessoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colaboradores" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "cpf" VARCHAR(11) NOT NULL,
    "cargo" VARCHAR(80) NOT NULL,
    "setor" VARCHAR(80) NOT NULL,
    "status" "StatusColaborador" NOT NULL DEFAULT 'ATIVO',
    "pinHash" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "colaboradores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "epis" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "numeroCA" VARCHAR(40) NOT NULL,
    "dataValidadeCA" DATE NOT NULL,
    "quantidadeEstoque" INTEGER NOT NULL DEFAULT 0,
    "estoqueMinimo" INTEGER NOT NULL DEFAULT 0,
    "intervaloTrocaDias" INTEGER NOT NULL DEFAULT 90,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "epis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entregas" (
    "id" UUID NOT NULL,
    "colaboradorId" UUID NOT NULL,
    "epiId" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "dataEntrega" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataPrevistaTroca" DATE NOT NULL,
    "assinaturaDigital" TEXT,
    "pinValidado" BOOLEAN NOT NULL DEFAULT false,
    "statusDevolucao" "StatusDevolucao" NOT NULL DEFAULT 'EM_USO',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entregas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacoes_estoque" (
    "id" UUID NOT NULL,
    "epiId" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "entregaId" UUID,
    "tipo" "TipoMovimentacao" NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "motivo" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacoes_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_ativo_idx" ON "usuarios"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "colaboradores_cpf_key" ON "colaboradores"("cpf");

-- CreateIndex
CREATE INDEX "colaboradores_nome_idx" ON "colaboradores"("nome");

-- CreateIndex
CREATE INDEX "colaboradores_setor_idx" ON "colaboradores"("setor");

-- CreateIndex
CREATE INDEX "colaboradores_status_idx" ON "colaboradores"("status");

-- CreateIndex
CREATE UNIQUE INDEX "epis_numeroCA_key" ON "epis"("numeroCA");

-- CreateIndex
CREATE INDEX "epis_dataValidadeCA_idx" ON "epis"("dataValidadeCA");

-- CreateIndex
CREATE INDEX "epis_ativo_idx" ON "epis"("ativo");

-- CreateIndex
CREATE INDEX "entregas_colaboradorId_statusDevolucao_idx" ON "entregas"("colaboradorId", "statusDevolucao");

-- CreateIndex
CREATE INDEX "entregas_epiId_idx" ON "entregas"("epiId");

-- CreateIndex
CREATE INDEX "entregas_dataPrevistaTroca_statusDevolucao_idx" ON "entregas"("dataPrevistaTroca", "statusDevolucao");

-- CreateIndex
CREATE INDEX "entregas_dataEntrega_idx" ON "entregas"("dataEntrega");

-- CreateIndex
CREATE INDEX "movimentacoes_estoque_epiId_createdAt_idx" ON "movimentacoes_estoque"("epiId", "createdAt");

-- CreateIndex
CREATE INDEX "movimentacoes_estoque_entregaId_idx" ON "movimentacoes_estoque"("entregaId");

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "colaboradores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_epiId_fkey" FOREIGN KEY ("epiId") REFERENCES "epis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_epiId_fkey" FOREIGN KEY ("epiId") REFERENCES "epis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_entregaId_fkey" FOREIGN KEY ("entregaId") REFERENCES "entregas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
