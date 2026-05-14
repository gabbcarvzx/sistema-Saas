-- Harden tenant isolation for billing audit events and add tenant-scoped lookup indexes.
-- Unresolved webhook events cannot be safely attributed to a tenant, so they are removed
-- before making PaymentEvent.tenantId mandatory.

DELETE FROM "PaymentEvent"
WHERE "tenantId" IS NULL;

ALTER TABLE "PaymentEvent"
DROP CONSTRAINT IF EXISTS "PaymentEvent_tenantId_fkey";

ALTER TABLE "PaymentEvent"
ALTER COLUMN "tenantId" SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE "PaymentEvent"
  ADD CONSTRAINT "PaymentEvent_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Store_tenantId_name_idx"
ON "Store"("tenantId", "name");

CREATE INDEX IF NOT EXISTS "Product_tenantId_category_idx"
ON "Product"("tenantId", "category");

CREATE INDEX IF NOT EXISTS "TenantSubscription_tenantId_status_idx"
ON "TenantSubscription"("tenantId", "status");

CREATE INDEX IF NOT EXISTS "PaymentEvent_tenantId_provider_eventType_idx"
ON "PaymentEvent"("tenantId", "provider", "eventType");
