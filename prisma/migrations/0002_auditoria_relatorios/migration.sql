-- =============================================================================
-- Módulo de auditoria / relatórios
-- =============================================================================
-- Adiciona snapshots de EPI/CA na entrega para que a ficha individual e o
-- comprovante de entrega preservem o dado do momento do ato, mesmo que o
-- cadastro do EPI seja atualizado depois.
-- =============================================================================

-- 1. Colunas entram como NULL para permitir backfill de entregas existentes.
ALTER TABLE "entregas"
  ADD COLUMN "epiNomeEntrega" VARCHAR(120),
  ADD COLUMN "numeroCAEntrega" VARCHAR(40),
  ADD COLUMN "validadeCAEntrega" DATE;

-- 2. Backfill: usa o cadastro atual do EPI como melhor aproximação histórica
--    para entregas registradas antes deste módulo.
UPDATE "entregas" AS e
SET
  "epiNomeEntrega" = epi."nome",
  "numeroCAEntrega" = epi."numeroCA",
  "validadeCAEntrega" = epi."dataValidadeCA"
FROM "epis" AS epi
WHERE epi."id" = e."epiId";

-- 3. A partir daqui toda nova entrega é obrigada a gravar o snapshot.
ALTER TABLE "entregas"
  ALTER COLUMN "epiNomeEntrega" SET NOT NULL,
  ALTER COLUMN "numeroCAEntrega" SET NOT NULL,
  ALTER COLUMN "validadeCAEntrega" SET NOT NULL;

-- 4. Índice para relatórios por validade do CA na entrega (auditoria histórica).
CREATE INDEX "entregas_validadeCAEntrega_idx" ON "entregas"("validadeCAEntrega");
