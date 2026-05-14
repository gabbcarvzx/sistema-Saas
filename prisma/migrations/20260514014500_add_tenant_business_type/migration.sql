DO $$ BEGIN
  CREATE TYPE "BusinessType" AS ENUM (
    'AUTO_REPAIR',
    'RETAIL',
    'RESTAURANT',
    'HEALTHCARE',
    'EDUCATION',
    'SERVICES',
    'GENERIC'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Tenant"
ADD COLUMN IF NOT EXISTS "businessType" "BusinessType" NOT NULL DEFAULT 'AUTO_REPAIR';

CREATE INDEX IF NOT EXISTS "Tenant_businessType_idx"
ON "Tenant"("businessType");
