-- Add Mercado Pago plan mapping to internal SaaS plans.
ALTER TABLE "SubscriptionPlan"
ADD COLUMN "mercadoPagoPlanId" TEXT;

CREATE UNIQUE INDEX "SubscriptionPlan_mercadoPagoPlanId_key"
ON "SubscriptionPlan"("mercadoPagoPlanId");
