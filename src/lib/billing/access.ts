import { prisma } from "@/lib/prisma";
import { PlanExpiredError } from "@/lib/http-errors";
import { logger } from "@/lib/logger";
import { ensureDefaultTenant } from "@/lib/tenant-provisioning";
import { DEFAULT_TENANT_SLUG } from "@/lib/tenant-resolver";
import {
  evaluateTenantAccess,
  type TenantAccessResult,
} from "@/lib/billing/policy";

async function markSubscriptionExpired(access: TenantAccessResult) {
  if (access.allowed || access.subscriptionStatus === "MISSING") {
    return;
  }

  if (
    access.reason !== "TRIAL_EXPIRED" &&
    access.reason !== "PLAN_EXPIRED"
  ) {
    return;
  }

  if (
    access.subscriptionStatus === "BLOCKED" ||
    access.subscriptionStatus === "CANCELED"
  ) {
    return;
  }

  await prisma.tenantSubscription.update({
    where: { tenantId: access.tenantId },
    data: {
      status: "BLOCKED",
      blockedAt: new Date(),
    },
  });

  logger.warn("billing.subscription.blocked", {
    tenantId: access.tenantId,
    tenantSlug: access.tenantSlug,
    reason: access.reason,
  });
}

export async function getTenantAccessBySlug(slug: string) {
  const tenant =
    (await prisma.tenant.findUnique({
      where: { slug },
      include: { subscription: true },
    })) ?? (slug === DEFAULT_TENANT_SLUG ? await ensureDefaultTenant() : null);

  if (!tenant) {
    return null;
  }

  const access = evaluateTenantAccess({
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    status: tenant.status,
    subscription: tenant.subscription
      ? {
          id: tenant.subscription.id,
          status: tenant.subscription.status,
          trialEndsAt: tenant.subscription.trialEndsAt,
          currentPeriodEnd: tenant.subscription.currentPeriodEnd,
          blockedAt: tenant.subscription.blockedAt,
        }
      : null,
  });

  await markSubscriptionExpired(access);

  return access;
}

export function assertTenantAccess(access: TenantAccessResult) {
  if (!access.allowed) {
    throw new PlanExpiredError("Plano expirado ou bloqueado.", {
      reason: access.reason,
      tenantSlug: access.tenantSlug,
      subscriptionStatus: access.subscriptionStatus,
    });
  }
}
