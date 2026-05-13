import { describe, expect, it } from "vitest";
import {
  evaluateTenantAccess,
  type TenantAccessSnapshot,
} from "../src/lib/billing/policy";

const now = new Date("2026-05-13T12:00:00.000Z");

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

  it("blocks expired trial automatically by policy", () => {
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

    expect(access.allowed).toBe(false);
    expect(access.reason).toBe("TRIAL_EXPIRED");
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

  it("blocks expired paid plan", () => {
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
    expect(access.reason).toBe("PLAN_EXPIRED");
  });
});
