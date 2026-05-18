-- DropIndex
DROP INDEX "SubscriptionPlan_mercadoPagoPlanId_key";

-- DropIndex
DROP INDEX "SubscriptionPlan_stripePriceId_key";

-- CreateIndex
CREATE INDEX "SubscriptionPlan_stripePriceId_idx" ON "SubscriptionPlan"("stripePriceId");

-- CreateIndex
CREATE INDEX "SubscriptionPlan_mercadoPagoPlanId_idx" ON "SubscriptionPlan"("mercadoPagoPlanId");
