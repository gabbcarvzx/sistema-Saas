import { prisma } from "@/lib/prisma";
import { ConflictError, ConfigurationError } from "@/lib/http-errors";
import { hashPassword } from "@/lib/auth/password";
import {
  DEFAULT_PLAN_SLUG,
  DEFAULT_TRIAL_DAYS,
  INITIAL_STORES,
  ensureSubscriptionPlans,
} from "@/lib/tenant-provisioning";
import type { SignupInput } from "@/lib/signup/schema";

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export async function signupTenant(input: SignupInput) {
  await ensureSubscriptionPlans();

  const existingTenant = await prisma.tenant.findUnique({
    where: { slug: input.tenantSlug },
    select: { id: true },
  });

  if (existingTenant) {
    throw new ConflictError("Ja existe um cliente com este slug.", {
      field: "tenantSlug",
    });
  }

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { slug: DEFAULT_PLAN_SLUG },
  });

  if (!plan) {
    throw new ConfigurationError("Plano trial nao encontrado.");
  }

  const now = new Date();
  const trialDays = plan.trialDays || DEFAULT_TRIAL_DAYS;
  const trialEndsAt = addDays(now, trialDays);
  const passwordHash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: input.companyName,
        slug: input.tenantSlug,
        logoUrl: input.logoUrl,
        primaryColor: input.primaryColor,
        supportEmail: input.supportEmail ?? input.adminEmail,
        settings: {},
        users: {
          create: {
            name: input.adminName,
            email: input.adminEmail,
            password: passwordHash,
            role: "ADMIN",
          },
        },
        stores: {
          create: INITIAL_STORES,
        },
        subscription: {
          create: {
            planId: plan.id,
            status: "TRIAL",
            trialEndsAt,
            currentPeriodStart: now,
            currentPeriodEnd: trialEndsAt,
          },
        },
      },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        subscription: true,
      },
    });

    return {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      adminUserId: tenant.users[0]?.id,
      trialEndsAt: tenant.subscription?.trialEndsAt ?? trialEndsAt,
    };
  });
}
