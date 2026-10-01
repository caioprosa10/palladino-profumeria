-- CreateTable
CREATE TABLE "Arquivo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "conteudo" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Arquivo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Arquivo_nome_key" ON "Arquivo"("nome");

-- CreateIndex
CREATE INDEX "Arquivo_createdAt_idx" ON "Arquivo"("createdAt");
