DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MEMBER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "primaryColor" TEXT NOT NULL DEFAULT '#22d3ee';
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "supportEmail" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "settings" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'MEMBER';
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_email_key";
DROP INDEX IF EXISTS "User_email_key";

ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_code_key";
DROP INDEX IF EXISTS "Product_code_key";

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'SubscriptionPlan'
      AND typtype = 'e'
  ) THEN
    ALTER TYPE "SubscriptionPlan" RENAME TO "SubscriptionPlanLegacy";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "priceCents" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "trialDays" INTEGER NOT NULL DEFAULT 14,
  "productLimit" INTEGER,
  "storeLimit" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SubscriptionPlan_slug_key" UNIQUE ("slug")
);

INSERT INTO "SubscriptionPlan" (
  "id",
  "slug",
  "name",
  "description",
  "priceCents",
  "currency",
  "trialDays",
  "productLimit",
  "storeLimit",
  "isActive"
)
VALUES
  ('00000000-0000-4000-8000-000000000101', 'trial', 'Trial', 'Periodo de avaliacao', 0, 'BRL', 14, 100, 3, true),
  ('00000000-0000-4000-8000-000000000102', 'starter', 'Starter', 'Plano inicial para oficinas pequenas', 4900, 'BRL', 14, 500, 5, true),
  ('00000000-0000-4000-8000-000000000103', 'professional', 'Professional', 'Plano profissional para operacao em crescimento', 9900, 'BRL', 14, 5000, 20, true),
  ('00000000-0000-4000-8000-000000000104', 'enterprise', 'Enterprise', 'Plano corporativo com limites customizados', 0, 'BRL', 14, NULL, NULL, true)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "priceCents" = EXCLUDED."priceCents",
  "currency" = EXCLUDED."currency",
  "trialDays" = EXCLUDED."trialDays",
  "productLimit" = EXCLUDED."productLimit",
  "storeLimit" = EXCLUDED."storeLimit",
  "isActive" = EXCLUDED."isActive";

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'SubscriptionStatus'
      AND typtype = 'e'
  ) THEN
    ALTER TYPE "SubscriptionStatus" RENAME TO "SubscriptionStatusLegacy";
  END IF;
END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'BLOCKED', 'CANCELED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "TenantSubscription" ADD COLUMN IF NOT EXISTS "planId" TEXT;

UPDATE "TenantSubscription"
SET "planId" = CASE
  WHEN "plan"::TEXT = 'STARTER' THEN '00000000-0000-4000-8000-000000000102'
  WHEN "plan"::TEXT = 'PROFESSIONAL' THEN '00000000-0000-4000-8000-000000000103'
  WHEN "plan"::TEXT = 'ENTERPRISE' THEN '00000000-0000-4000-8000-000000000104'
  ELSE '00000000-0000-4000-8000-000000000101'
END
WHERE "planId" IS NULL;

ALTER TABLE "TenantSubscription" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "TenantSubscription"
  ALTER COLUMN "status" TYPE "SubscriptionStatus"
  USING CASE
    WHEN "status"::TEXT = 'TRIALING' THEN 'TRIAL'
    WHEN "status"::TEXT = 'ACTIVE' THEN 'ACTIVE'
    WHEN "status"::TEXT = 'CANCELED' THEN 'CANCELED'
    ELSE 'BLOCKED'
  END::"SubscriptionStatus";
ALTER TABLE "TenantSubscription" ALTER COLUMN "status" SET DEFAULT 'TRIAL';
ALTER TABLE "TenantSubscription" ALTER COLUMN "planId" SET NOT NULL;

ALTER TABLE "TenantSubscription" DROP COLUMN IF EXISTS "plan";

DO $$ BEGIN
  ALTER TABLE "TenantSubscription"
  ADD CONSTRAINT "TenantSubscription_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "SubscriptionPlan_isActive_idx" ON "SubscriptionPlan"("isActive");
CREATE INDEX IF NOT EXISTS "TenantSubscription_planId_idx" ON "TenantSubscription"("planId");
CREATE INDEX IF NOT EXISTS "TenantSubscription_status_currentPeriodEnd_idx" ON "TenantSubscription"("status", "currentPeriodEnd");

DROP TYPE IF EXISTS "SubscriptionPlanLegacy";
DROP TYPE IF EXISTS "SubscriptionStatusLegacy";
