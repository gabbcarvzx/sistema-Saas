DO $$ BEGIN
  CREATE TYPE "PlanCode" AS ENUM ('TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "code" "PlanCode";
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "stripePriceId" TEXT;

UPDATE "SubscriptionPlan"
SET "code" = CASE
  WHEN "slug" = 'starter' THEN 'STARTER'::"PlanCode"
  WHEN "slug" = 'professional' THEN 'PROFESSIONAL'::"PlanCode"
  WHEN "slug" = 'enterprise' THEN 'ENTERPRISE'::"PlanCode"
  ELSE 'TRIAL'::"PlanCode"
END
WHERE "code" IS NULL;

ALTER TABLE "SubscriptionPlan" ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionPlan_code_key" ON "SubscriptionPlan"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionPlan_stripePriceId_key" ON "SubscriptionPlan"("stripePriceId");
