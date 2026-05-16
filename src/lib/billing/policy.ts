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
    | "SUBSCRIPTION_EXPIRED"
    | "SUBSCRIPTION_BLOCKED"
    | "SUBSCRIPTION_CANCELED";
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  subscriptionStatus: SubscriptionStatusCode | "MISSING";
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
};

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

  if (tenant.subscription.status === "BLOCKED") {
    return { ...base, allowed: false, reason: "SUBSCRIPTION_BLOCKED" };
  }

  if (tenant.subscription.status === "CANCELED") {
    return { ...base, allowed: false, reason: "SUBSCRIPTION_CANCELED" };
  }

  if (tenant.subscription.status === "TRIAL") {
    return { ...base, allowed: true, reason: "TRIAL_ACTIVE" };
  }

  if (
    tenant.subscription.status === "ACTIVE" &&
    tenant.subscription.currentPeriodEnd &&
    tenant.subscription.currentPeriodEnd.getTime() < now.getTime()
  ) {
    return { ...base, allowed: false, reason: "SUBSCRIPTION_EXPIRED" };
  }

  return { ...base, allowed: true, reason: "PLAN_ACTIVE" };
}
