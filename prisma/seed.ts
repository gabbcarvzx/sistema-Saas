import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;
const seedDatabaseUrl = process.env.DIRECT_URL ?? databaseUrl;

if (!seedDatabaseUrl) {
  throw new Error("DIRECT_URL ou DATABASE_URL nao configurada.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: seedDatabaseUrl,
    max: 1,
    connectionTimeoutMillis: 10_000,
  }),
});

const DEFAULT_TENANT_SLUG =
  process.env.DEFAULT_TENANT_SLUG ?? "demo-oficina";
const DEFAULT_TENANT_NAME =
  process.env.DEFAULT_TENANT_NAME ?? "Oficina Demo";
const DEFAULT_TRIAL_DAYS = Number(
  process.env.DEFAULT_TRIAL_DAYS ?? 14
);

const plans = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    slug: "trial",
    code: "TRIAL" as const,
    name: "Trial",
    description: "Periodo de avaliacao",
    priceCents: 0,
    stripePriceId: process.env.STRIPE_PRICE_TRIAL ?? null,
    mercadoPagoPlanId: process.env.MERCADO_PAGO_PLAN_TRIAL ?? null,
    trialDays: DEFAULT_TRIAL_DAYS,
    productLimit: 100,
    storeLimit: 3,
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    slug: "starter",
    code: "STARTER" as const,
    name: "Starter",
    description: "Plano inicial para oficinas pequenas",
    priceCents: 4900,
    stripePriceId: process.env.STRIPE_PRICE_STARTER ?? null,
    mercadoPagoPlanId: process.env.MERCADO_PAGO_PLAN_STARTER ?? null,
    trialDays: DEFAULT_TRIAL_DAYS,
    productLimit: 500,
    storeLimit: 5,
  },
  {
    id: "00000000-0000-4000-8000-000000000103",
    slug: "professional",
    code: "PROFESSIONAL" as const,
    name: "Professional",
    description: "Plano profissional para operacao em crescimento",
    priceCents: 9900,
    stripePriceId: process.env.STRIPE_PRICE_PROFESSIONAL ?? null,
    mercadoPagoPlanId: process.env.MERCADO_PAGO_PLAN_PROFESSIONAL ?? null,
    trialDays: DEFAULT_TRIAL_DAYS,
    productLimit: 5000,
    storeLimit: 20,
  },
  {
    id: "00000000-0000-4000-8000-000000000104",
    slug: "enterprise",
    code: "ENTERPRISE" as const,
    name: "Enterprise",
    description: "Plano corporativo com limites customizados",
    priceCents: 0,
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE ?? null,
    mercadoPagoPlanId: process.env.MERCADO_PAGO_PLAN_ENTERPRISE ?? null,
    trialDays: DEFAULT_TRIAL_DAYS,
    productLimit: null,
    storeLimit: null,
  },
];

const initialStores = [
  { name: "Loja Matriz", location: "Centro" },
  { name: "Centro", location: "Unidade comercial" },
  { name: "Zona Sul", location: "Filial" },
];

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

async function main() {
  // ✅ Criar ou atualizar planos
  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { slug: plan.slug },
      update: {
        name: plan.name,
        description: plan.description,
        priceCents: plan.priceCents,
        stripePriceId: plan.stripePriceId,
        mercadoPagoPlanId: plan.mercadoPagoPlanId,
        trialDays: plan.trialDays,
        productLimit: plan.productLimit,
        storeLimit: plan.storeLimit,
        isActive: true,
      },
      create: {
        id: plan.id,
        slug: plan.slug,
        code: plan.code,
        name: plan.name,
        description: plan.description,
        priceCents: plan.priceCents,
        currency: "BRL",
        stripePriceId: plan.stripePriceId,
        mercadoPagoPlanId: plan.mercadoPagoPlanId,
        trialDays: plan.trialDays,
        productLimit: plan.productLimit,
        storeLimit: plan.storeLimit,
        isActive: true,
      },
    });
  }

  const trialPlan = await prisma.subscriptionPlan.findUniqueOrThrow({
    where: { slug: "trial" },
  });

  const now = new Date();
  const trialEndsAt = addDays(now, trialPlan.trialDays);

  // ✅ Criar tenant demo
  const tenant = await prisma.tenant.upsert({
    where: { slug: DEFAULT_TENANT_SLUG },
    update: {
      name: DEFAULT_TENANT_NAME,
      status: "ACTIVE",
    },
    create: {
      name: DEFAULT_TENANT_NAME,
      slug: DEFAULT_TENANT_SLUG,
      status: "ACTIVE",
      primaryColor: "#22d3ee",
      supportEmail: process.env.SUPPORT_EMAIL ?? null,
      subscription: {
        create: {
          planId: trialPlan.id,
          status: "TRIAL",
          trialEndsAt,
          currentPeriodStart: now,
          currentPeriodEnd: trialEndsAt,
        },
      },
    },
    include: { subscription: true },
  });

  // ✅ Garantir assinatura
  if (!tenant.subscription) {
    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenant.id,
        planId: trialPlan.id,
        status: "TRIAL",
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
      },
    });
  }

  // ✅ Criar lojas iniciais
  for (const store of initialStores) {
    const existingStore = await prisma.store.findFirst({
      where: {
        tenantId: tenant.id,
        name: store.name,
      },
      select: { id: true },
    });

    if (!existingStore) {
      await prisma.store.create({
        data: {
          name: store.name,
          location: store.location,
          tenantId: tenant.id,
        },
      });
    }
  }

  console.log(
    JSON.stringify({
      level: "info",
      message: "seed.completed",
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      timestamp: new Date().toISOString(),
    })
  );
}

main()
  .catch((error) => {
    console.error(
      JSON.stringify({
        level: "error",
        message: "seed.failed",
        error:
          error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      })
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });