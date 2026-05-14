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

  const now = new Date();
  const trialEndsAt = addDays(now, DEFAULT_TRIAL_DAYS);
  const passwordHash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const plan = await tx.subscriptionPlan.findUnique({
      where: { slug: DEFAULT_PLAN_SLUG },
      select: { id: true },
    });

    if (!plan) {
      throw new ConfigurationError("Plano trial nao encontrado.");
    }

    const tenant = await tx.tenant.create({
      data: {
        name: input.companyName,
        slug: input.tenantSlug,
        businessType: "AUTO_REPAIR",
        logoUrl: input.logoUrl,
        primaryColor: input.primaryColor,
        supportEmail: input.supportEmail ?? input.adminEmail,
        settings: {},
      },
      select: {
        id: true,
        slug: true,
      },
    });

    const adminUser = await tx.user.create({
      data: {
        tenantId: tenant.id,
        name: input.adminName,
        email: input.adminEmail,
        password: passwordHash,
        role: "ADMIN",
      },
      select: { id: true },
    });

    await tx.store.createMany({
      data: INITIAL_STORES.map((store) => ({
        ...store,
        tenantId: tenant.id,
      })),
    });

    const subscription = await tx.tenantSubscription.create({
      data: {
        tenantId: tenant.id,
        planId: plan.id,
        status: "TRIAL",
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
      },
      select: {
        id: true,
        status: true,
        trialEndsAt: true,
      },
    });

    return {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      adminUserId: adminUser.id,
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      trialStartsAt: now,
      trialEndsAt: subscription.trialEndsAt ?? trialEndsAt,
    };
  });
}