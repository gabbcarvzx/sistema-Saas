import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    tenantSubscription: {
      updateMany: vi.fn(),
    },
  },
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/logger", () => ({
  logger: mocks.logger,
}));

describe("billing renewals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
  });

  it("bloqueia assinaturas ACTIVE ou TRIAL vencidas", async () => {
    const now = new Date("2026-05-16T12:00:00.000Z");
    mocks.prisma.tenantSubscription.updateMany.mockResolvedValue({ count: 2 });

    const { blockExpiredTenantSubscriptions } = await import(
      "../src/lib/billing/renewals"
    );

    const result = await blockExpiredTenantSubscriptions(now);

    expect(result).toEqual({
      checkedAt: now,
      blockedCount: 2,
    });
    expect(mocks.prisma.tenantSubscription.updateMany).toHaveBeenCalledWith({
      where: {
        OR: [
          {
            status: "ACTIVE",
            currentPeriodEnd: {
              lt: now,
            },
          },
          {
            status: "TRIAL",
            trialEndsAt: {
              lt: now,
            },
          },
        ],
      },
      data: {
        status: "BLOCKED",
        blockedAt: now,
        cancelAtPeriodEnd: false,
      },
    });
  });

  it("rota cron executa bloqueio quando bearer e valido", async () => {
    process.env.CRON_SECRET = "cron-secret";
    mocks.prisma.tenantSubscription.updateMany.mockResolvedValue({ count: 1 });

    const { GET } = await import(
      "../src/app/api/cron/billing-expiration/route"
    );

    const response = await GET(
      new Request("https://stockpro.test/api/cron/billing-expiration", {
        headers: {
          authorization: "Bearer cron-secret",
        },
      }),
      undefined,
    );
    const body = (await response.json()) as { ok: boolean; updated: number };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.updated).toBe(1);
    expect(mocks.prisma.tenantSubscription.updateMany).toHaveBeenCalledTimes(1);
  });

  it("rota cron rejeita bearer invalido", async () => {
    process.env.CRON_SECRET = "cron-secret";

    const { GET } = await import(
      "../src/app/api/cron/billing-expiration/route"
    );

    const response = await GET(
      new Request("https://stockpro.test/api/cron/billing-expiration", {
        headers: {
          authorization: "Bearer outra-chave",
        },
      }),
      undefined,
    );

    expect(response.status).toBe(401);
    expect(mocks.prisma.tenantSubscription.updateMany).not.toHaveBeenCalled();
  });
});
