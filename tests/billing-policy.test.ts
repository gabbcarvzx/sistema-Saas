import { describe, expect, it } from "vitest";
import {
  evaluateTenantAccess,
  type TenantAccessSnapshot,
} from "../src/lib/billing/policy";

function tenant(
  subscription: TenantAccessSnapshot["subscription"],
): TenantAccessSnapshot {
  return {
    id: "tenant-1",
    slug: "oficina-demo",
    name: "Oficina Demo",
    status: "ACTIVE",
    subscription,
  };
}

describe("evaluateTenantAccess", () => {
  const now = new Date("2026-05-16T12:00:00.000Z");

  it("allows active trial before trial end", () => {
    const access = evaluateTenantAccess(
      tenant({
        id: "sub-1",
        status: "TRIAL",
        trialEndsAt: new Date("2026-05-20T12:00:00.000Z"),
        currentPeriodEnd: new Date("2026-05-20T12:00:00.000Z"),
        blockedAt: null,
      }),
      now,
    );

    expect(access.allowed).toBe(true);
    expect(access.reason).toBe("TRIAL_ACTIVE");
  });

  it("allows trial status even after trial end until billing marks it blocked", () => {
    const access = evaluateTenantAccess(
      tenant({
        id: "sub-1",
        status: "TRIAL",
        trialEndsAt: new Date("2026-05-01T12:00:00.000Z"),
        currentPeriodEnd: new Date("2026-05-01T12:00:00.000Z"),
        blockedAt: null,
      }),
      now,
    );

    expect(access.allowed).toBe(true);
    expect(access.reason).toBe("TRIAL_ACTIVE");
  });

  it("allows active paid plan without period end for manual billing", () => {
    const access = evaluateTenantAccess(
      tenant({
        id: "sub-1",
        status: "ACTIVE",
        trialEndsAt: null,
        currentPeriodEnd: null,
        blockedAt: null,
      }),
      now,
    );

    expect(access.allowed).toBe(true);
    expect(access.reason).toBe("PLAN_ACTIVE");
  });

  it("blocks active paid plan after current period end", () => {
    const access = evaluateTenantAccess(
      tenant({
        id: "sub-1",
        status: "ACTIVE",
        trialEndsAt: null,
        currentPeriodEnd: new Date("2026-05-01T12:00:00.000Z"),
        blockedAt: null,
      }),
      now,
    );

    expect(access.allowed).toBe(false);
    expect(access.reason).toBe("SUBSCRIPTION_EXPIRED");
  });

  it("allows active paid plan even when blockedAt has stale audit data", () => {
    const access = evaluateTenantAccess(
      tenant({
        id: "sub-1",
        status: "ACTIVE",
        trialEndsAt: null,
        currentPeriodEnd: new Date("2026-05-20T12:00:00.000Z"),
        blockedAt: new Date("2026-05-01T12:00:00.000Z"),
      }),
      now,
    );

    expect(access.allowed).toBe(true);
    expect(access.reason).toBe("PLAN_ACTIVE");
  });

  it("blocks explicitly blocked subscriptions", () => {
    const access = evaluateTenantAccess(
      tenant({
        id: "sub-1",
        status: "BLOCKED",
        trialEndsAt: null,
        currentPeriodEnd: null,
        blockedAt: new Date("2026-05-01T12:00:00.000Z"),
      }),
      now,
    );

    expect(access.allowed).toBe(false);
    expect(access.reason).toBe("SUBSCRIPTION_BLOCKED");
  });

  it("blocks canceled subscriptions", () => {
    const access = evaluateTenantAccess(
      tenant({
        id: "sub-1",
        status: "CANCELED",
        trialEndsAt: null,
        currentPeriodEnd: null,
        blockedAt: new Date("2026-05-01T12:00:00.000Z"),
      }),
      now,
    );

    expect(access.allowed).toBe(false);
    expect(access.reason).toBe("SUBSCRIPTION_CANCELED");
  });
});
