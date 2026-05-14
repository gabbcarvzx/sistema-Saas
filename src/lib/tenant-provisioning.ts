import { prisma } from "@/lib/prisma";
import { DEFAULT_TENANT_SLUG } from "@/lib/tenant-resolver";

const FALLBACK_TRIAL_DAYS = 14;

function parseDefaultTrialDays() {
  const parsed = Number(process.env.DEFAULT_TRIAL_DAYS ?? FALLBACK_TRIAL_DAYS);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : FALLBACK_TRIAL_DAYS;
}

export const DEFAULT_TRIAL_DAYS = parseDefaultTrialDays();

export const INITIAL_STORES = [
  { name: "Loja Matriz", location: "Centro" },
  { name: "Centro", location: "Unidade comercial" },
  { name: "Zona Sul", location: "Filial" },
];

export const DEFAULT_PLAN_SLUG = "trial";

export const DEFAULT_SUBSCRIPTION_PLANS = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    slug: "trial",
    code: "TRIAL" as const,
    name: "Trial",
    description: "Periodo de avaliacao",
    priceCents: 0,
    stripePriceId: process.env.STRIPE_PRICE_TRIAL,
    mercadoPagoPlanId: process.env.MERCADO_PAGO_PLAN_TRIAL,
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
    stripePriceId: process.env.STRIPE_PRICE_STARTER,
    mercadoPagoPlanId: process.env.MERCADO_PAGO_PLAN_STARTER,
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
    stripePriceId: process.env.STRIPE_PRICE_PROFESSIONAL,
    mercadoPagoPlanId: process.env.MERCADO_PAGO_PLAN_PROFESSIONAL,
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
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE,
    mercadoPagoPlanId: process.env.MERCADO_PAGO_PLAN_ENTERPRISE,
    trialDays: DEFAULT_TRIAL_DAYS,
    productLimit: null,
    storeLimit: null,
  },
];

type CreateInitialTenantInput = {
  name: string;
  slug: string;
  businessType?: "AUTO_REPAIR" | "RETAIL" | "RESTAURANT" | "HEALTHCARE" | "EDUCATION" | "SERVICES" | "GENERIC";
  trialDays?: number;
};

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export async function ensureSubscriptionPlans() {
  for (const plan of DEFAULT_SUBSCRIPTION_PLANS) {
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
        ...plan,
        currency: "BRL",
        isActive: true,
      },
    });
  }
}

export async function createInitialTenant({
  name,
  slug,
  businessType = "AUTO_REPAIR",
  trialDays = DEFAULT_TRIAL_DAYS,
}: CreateInitialTenantInput) {
  await ensureSubscriptionPlans();

  const existingTenant = await prisma.tenant.findUnique({
    where: { slug },
    include: { subscription: true },
  });

  if (existingTenant) {
    return existingTenant;
  }

  const now = new Date();
  const trialStartsAt = now;
  const trialEndsAt = addDays(trialStartsAt, trialDays);

  return prisma.$transaction(async (tx) => {
    const plan = await tx.subscriptionPlan.findUniqueOrThrow({
      where: { slug: DEFAULT_PLAN_SLUG },
      select: { id: true },
    });

    const tenant = await tx.tenant.create({
      data: {
        name,
        slug,
        businessType,
        subscription: {
          create: {
            planId: plan.id,
            status: "TRIAL",
            trialStartsAt,
            trialEndsAt,
            currentPeriodStart: trialStartsAt,
            currentPeriodEnd: trialEndsAt,
          },
        },
      },
      include: { subscription: true },
    });

    await tx.store.createMany({
      data: INITIAL_STORES.map((store) => ({
        ...store,
        tenantId: tenant.id,
      })),
    });

    return tenant;
  });
}

export async function ensureDefaultTenant() {
  return createInitialTenant({
    name: process.env.DEFAULT_TENANT_NAME ?? "Oficina Demo",
    slug: DEFAULT_TENANT_SLUG,
  });
}
