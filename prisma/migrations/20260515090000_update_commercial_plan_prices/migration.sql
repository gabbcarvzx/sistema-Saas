UPDATE "SubscriptionPlan"
SET
  "name" = 'Starter',
  "description" = 'Plano inicial para oficinas pequenas',
  "priceCents" = 3900,
  "productLimit" = 500,
  "storeLimit" = 5,
  "isActive" = true
WHERE "code" = 'STARTER';

UPDATE "SubscriptionPlan"
SET
  "name" = 'Pro',
  "description" = 'Plano mais escolhido para negocios em crescimento',
  "priceCents" = 7900,
  "productLimit" = 5000,
  "storeLimit" = 20,
  "isActive" = true
WHERE "code" = 'PROFESSIONAL';

UPDATE "SubscriptionPlan"
SET
  "name" = 'Business',
  "description" = 'Plano para operacao multi-unidade',
  "priceCents" = 14900,
  "productLimit" = NULL,
  "storeLimit" = NULL,
  "isActive" = true
WHERE "code" = 'ENTERPRISE';
