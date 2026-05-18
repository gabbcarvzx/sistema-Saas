ALTER TABLE "TenantSubscription"
ADD COLUMN IF NOT EXISTS "trialStartsAt" TIMESTAMP(3);

UPDATE "TenantSubscription"
SET "trialStartsAt" = COALESCE("currentPeriodStart", "createdAt")
WHERE "trialStartsAt" IS NULL;

CREATE INDEX IF NOT EXISTS "TenantSubscription_status_trialStartsAt_idx"
ON "TenantSubscription"("status", "trialStartsAt");
