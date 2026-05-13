DO $$ BEGIN
  CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionPlan" AS ENUM ('TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED', 'BLOCKED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'MERCADO_PAGO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Tenant" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Tenant_slug_key" UNIQUE ("slug")
);

INSERT INTO "Tenant" ("id", "name", "slug", "status", "createdAt", "updatedAt")
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'Oficina Demo',
  'demo-oficina',
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;

CREATE TABLE IF NOT EXISTS "User" (
  "tenantId" TEXT NOT NULL,
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Store" (
  "tenantId" TEXT NOT NULL,
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "location" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Store_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Store_tenantId_id_key" UNIQUE ("tenantId", "id")
);

CREATE TABLE IF NOT EXISTS "Product" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "quantity" INTEGER NOT NULL,
  "minStock" INTEGER NOT NULL,
  "category" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TenantSubscription" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "plan" "SubscriptionPlan" NOT NULL DEFAULT 'TRIAL',
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
  "provider" "PaymentProvider",
  "providerCustomerId" TEXT,
  "providerSubscriptionId" TEXT,
  "trialEndsAt" TIMESTAMP(3),
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "blockedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantSubscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TenantSubscription_tenantId_key" UNIQUE ("tenantId")
);

CREATE TABLE IF NOT EXISTS "PaymentEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "provider" "PaymentProvider" NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE IF EXISTS "User" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
UPDATE "User"
SET "tenantId" = '00000000-0000-4000-8000-000000000001'
WHERE "tenantId" IS NULL;
ALTER TABLE IF EXISTS "User" ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE IF EXISTS "Store" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
UPDATE "Store"
SET "tenantId" = '00000000-0000-4000-8000-000000000001'
WHERE "tenantId" IS NULL;
ALTER TABLE IF EXISTS "Store" ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE IF EXISTS "Product" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
UPDATE "Product"
SET "tenantId" = '00000000-0000-4000-8000-000000000001'
WHERE "tenantId" IS NULL;
ALTER TABLE IF EXISTS "Product" ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE IF EXISTS "User" DROP CONSTRAINT IF EXISTS "User_email_key";
ALTER TABLE IF EXISTS "Product" DROP CONSTRAINT IF EXISTS "Product_code_key";
ALTER TABLE IF EXISTS "Product" DROP CONSTRAINT IF EXISTS "Product_storeId_fkey";

CREATE UNIQUE INDEX IF NOT EXISTS "User_tenantId_email_key" ON "User"("tenantId", "email");
CREATE INDEX IF NOT EXISTS "User_tenantId_idx" ON "User"("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "Store_tenantId_id_key" ON "Store"("tenantId", "id");
CREATE INDEX IF NOT EXISTS "Store_tenantId_idx" ON "Store"("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "Product_tenantId_id_key" ON "Product"("tenantId", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "Product_tenantId_code_key" ON "Product"("tenantId", "code");
CREATE INDEX IF NOT EXISTS "Product_tenantId_idx" ON "Product"("tenantId");
CREATE INDEX IF NOT EXISTS "Product_tenantId_storeId_idx" ON "Product"("tenantId", "storeId");
CREATE INDEX IF NOT EXISTS "Tenant_status_idx" ON "Tenant"("status");
CREATE INDEX IF NOT EXISTS "TenantSubscription_status_trialEndsAt_idx" ON "TenantSubscription"("status", "trialEndsAt");
CREATE INDEX IF NOT EXISTS "TenantSubscription_provider_providerCustomerId_idx" ON "TenantSubscription"("provider", "providerCustomerId");
CREATE INDEX IF NOT EXISTS "TenantSubscription_provider_providerSubscriptionId_idx" ON "TenantSubscription"("provider", "providerSubscriptionId");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentEvent_provider_providerEventId_key" ON "PaymentEvent"("provider", "providerEventId");
CREATE INDEX IF NOT EXISTS "PaymentEvent_tenantId_idx" ON "PaymentEvent"("tenantId");
CREATE INDEX IF NOT EXISTS "PaymentEvent_provider_eventType_idx" ON "PaymentEvent"("provider", "eventType");

DO $$ BEGIN
  ALTER TABLE "User"
  ADD CONSTRAINT "User_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Store"
  ADD CONSTRAINT "Store_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Product"
  ADD CONSTRAINT "Product_tenantId_storeId_fkey"
  FOREIGN KEY ("tenantId", "storeId") REFERENCES "Store"("tenantId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TenantSubscription"
  ADD CONSTRAINT "TenantSubscription_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PaymentEvent"
  ADD CONSTRAINT "PaymentEvent_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO "TenantSubscription" (
  "id",
  "tenantId",
  "plan",
  "status",
  "trialEndsAt",
  "currentPeriodStart",
  "currentPeriodEnd",
  "createdAt",
  "updatedAt"
)
VALUES (
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  'TRIAL',
  'TRIALING',
  CURRENT_TIMESTAMP + INTERVAL '14 days',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '14 days',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("tenantId") DO NOTHING;
