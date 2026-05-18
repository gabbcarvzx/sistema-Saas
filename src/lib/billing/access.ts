import { prisma } from "@/lib/prisma";
import { PlanExpiredError } from "@/lib/http-errors";
import { ensureDefaultTenant } from "@/lib/tenant-provisioning";
import { DEFAULT_TENANT_SLUG } from "@/lib/tenant-resolver";
import {
  evaluateTenantAccess,
  type TenantAccessResult,
} from "@/lib/billing/policy";

export async function getTenantAccessBySlug(slug: string) {
  const tenant =
    (await prisma.tenant.findUnique({
      where: { slug },
      include: { subscription: true },
    })) ?? (slug === DEFAULT_TENANT_SLUG ? await ensureDefaultTenant() : null);

  if (!tenant) {
    return null;
  }

  return evaluateTenantAccess({
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
}

export function assertTenantAccess(access: TenantAccessResult) {
  if (!access.allowed) {
    throw new PlanExpiredError("Plano bloqueado ou cancelado.", {
      reason: access.reason,
      tenantSlug: access.tenantSlug,
      subscriptionStatus: access.subscriptionStatus,
    });
  }
}
