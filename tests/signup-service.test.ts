import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    subscriptionPlan: {
      findUnique: vi.fn(),
    },
    tenant: {
      create: vi.fn(),
    },
    user: {
      create: vi.fn(),
    },
    store: {
      createMany: vi.fn(),
    },
    tenantSubscription: {
      create: vi.fn(),
    },
  };

  return {
    hashPassword: vi.fn(),
    prisma: {
      subscriptionPlan: {
        upsert: vi.fn(),
      },
      tenant: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn(),
    },
    tx,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/auth/password", () => ({
  hashPassword: mocks.hashPassword,
}));

describe("signupTenant", () => {
  const now = new Date("2026-05-14T12:00:00.000Z");
  const trialEndsAt = new Date("2026-05-21T12:00:00.000Z");

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    process.env.DEFAULT_TRIAL_DAYS = "7";

    mocks.hashPassword.mockResolvedValue("hashed-password");
    mocks.prisma.subscriptionPlan.upsert.mockResolvedValue({});
    mocks.prisma.tenant.findUnique.mockResolvedValue(null);
    mocks.prisma.$transaction.mockImplementation(async (callback) =>
      callback(mocks.tx),
    );

    mocks.tx.subscriptionPlan.findUnique.mockResolvedValue({
      id: "plan-trial",
    });
    mocks.tx.tenant.create.mockResolvedValue({
      id: "tenant-1",
      slug: "oficina-teste",
    });
    mocks.tx.user.create.mockResolvedValue({
      id: "user-admin-1",
    });
    mocks.tx.store.createMany.mockResolvedValue({ count: 3 });
    mocks.tx.tenantSubscription.create.mockResolvedValue({
      id: "subscription-1",
      status: "TRIAL",
      trialEndsAt,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    delete process.env.DEFAULT_TRIAL_DAYS;
  });

  it("cria Tenant, User, Store e TenantSubscription TRIAL valida dentro da transacao", async () => {
    const { signupTenant } = await import("../src/lib/signup/service");

    const result = await signupTenant({
      companyName: "Oficina Teste",
      tenantSlug: "oficina-teste",
      adminName: "Admin Teste",
      adminEmail: "admin@oficina.test",
      password: "Teste123456!",
      primaryColor: "#22d3ee",
    });

    expect(mocks.prisma.$transaction).toHaveBeenCalledTimes(1);

    expect(mocks.tx.tenant.create).toHaveBeenCalledWith({
      data: {
        name: "Oficina Teste",
        slug: "oficina-teste",
        businessType: "AUTO_REPAIR",
        logoUrl: undefined,
        primaryColor: "#22d3ee",
        supportEmail: "admin@oficina.test",
        settings: {},
      },
      select: {
        id: true,
        slug: true,
      },
    });

    expect(mocks.tx.user.create).toHaveBeenCalledWith({
      data: {
        tenantId: "tenant-1",
        name: "Admin Teste",
        email: "admin@oficina.test",
        password: "hashed-password",
        role: "ADMIN",
      },
      select: { id: true },
    });

    expect(mocks.tx.store.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          tenantId: "tenant-1",
          name: "Loja Matriz",
        }),
      ]),
    });

    expect(mocks.tx.tenantSubscription.create).toHaveBeenCalledWith({
      data: {
        tenantId: "tenant-1",
        planId: "plan-trial",
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

    expect(result).toEqual({
      tenantId: "tenant-1",
      tenantSlug: "oficina-teste",
      adminUserId: "user-admin-1",
      subscriptionId: "subscription-1",
      subscriptionStatus: "TRIAL",
      trialStartsAt: now,
      trialEndsAt,
    });
  });
});