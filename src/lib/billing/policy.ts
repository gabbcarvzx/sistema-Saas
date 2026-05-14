export type SubscriptionStatusCode = "TRIAL" | "ACTIVE" | "BLOCKED" | "CANCELED";

export type TenantStatusCode = "ACTIVE" | "SUSPENDED";

export type SubscriptionSnapshot = {
  id: string;
  status: SubscriptionStatusCode;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  blockedAt: Date | null;
};

export type TenantAccessSnapshot = {
  id: string;
  slug: string;
  name: string;
  status: TenantStatusCode;
  subscription: SubscriptionSnapshot | null;
};

export type TenantAccessResult = {
  allowed: boolean;
  reason:
    | "TRIAL_ACTIVE"
    | "PLAN_ACTIVE"
    | "TENANT_SUSPENDED"
    | "SUBSCRIPTION_MISSING"
    | "TRIAL_EXPIRED"
    | "PLAN_EXPIRED"
    | "SUBSCRIPTION_BLOCKED";
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  subscriptionStatus: SubscriptionStatusCode | "MISSING";
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
};

function isPast(date: Date | null, now: Date) {
  return date !== null && date.getTime() < now.getTime();
}

export function evaluateTenantAccess(
  tenant: TenantAccessSnapshot,
  now = new Date(),
): TenantAccessResult {
  const base: Omit<TenantAccessResult, "allowed" | "reason"> = {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
    subscriptionStatus: tenant.subscription?.status ?? "MISSING",
    trialEndsAt: tenant.subscription?.trialEndsAt?.toISOString() ?? null,
    currentPeriodEnd:
      tenant.subscription?.currentPeriodEnd?.toISOString() ?? null,
  };

  if (tenant.status !== "ACTIVE") {
    return { ...base, allowed: false, reason: "TENANT_SUSPENDED" };
  }

  if (!tenant.subscription) {
    return { ...base, allowed: false, reason: "SUBSCRIPTION_MISSING" };
  }

  if (
    tenant.subscription.status === "BLOCKED" ||
    tenant.subscription.status === "CANCELED"
  ) {
    return { ...base, allowed: false, reason: "SUBSCRIPTION_BLOCKED" };
  }

  if (tenant.subscription.status === "TRIAL") {
    return isPast(tenant.subscription.trialEndsAt, now)
      ? { ...base, allowed: false, reason: "TRIAL_EXPIRED" }
      : { ...base, allowed: true, reason: "TRIAL_ACTIVE" };
  }

  return isPast(tenant.subscription.currentPeriodEnd, now)
    ? { ...base, allowed: false, reason: "PLAN_EXPIRED" }
    : { ...base, allowed: true, reason: "PLAN_ACTIVE" };
}
