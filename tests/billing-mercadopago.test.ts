import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  paymentGet: vi.fn(),
  preApprovalCreate: vi.fn(),
  preApprovalGet: vi.fn(),
  prisma: {
    subscriptionPlan: {
      findUnique: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
    tenantSubscription: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    paymentEvent: {
      upsert: vi.fn(),
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

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn(function MercadoPagoConfig(config) {
    return config;
  }),
  Payment: vi.fn(function Payment() {
    return {
      get: mocks.paymentGet,
    };
  }),
  PreApproval: vi.fn(function PreApproval() {
    return {
      create: mocks.preApprovalCreate,
      get: mocks.preApprovalGet,
    };
  }),
  Preference: vi.fn(function Preference() {
    return {
      create: vi.fn(),
    };
  }),
}));

const mercadoPagoEnv = [
  "MERCADO_PAGO_ACCESS_TOKEN",
  "MERCADO_PAGO_PLAN_STARTER",
  "MERCADO_PAGO_PLAN_PROFESSIONAL",
  "MERCADO_PAGO_PLAN_ENTERPRISE",
  "MERCADO_PAGO_WEBHOOK_SECRET",
  "MERCADO_PAGO_WEBHOOK_TOLERANCE_MS",
] as const;

function resetMercadoPagoEnv() {
  for (const key of mercadoPagoEnv) {
    delete process.env[key];
  }
}

function mockCheckoutDatabase() {
  mocks.prisma.subscriptionPlan.findUnique.mockResolvedValue({
    id: "plan-professional",
    code: "PROFESSIONAL",
    name: "Pro",
    priceCents: 7900,
    currency: "BRL",
    stripePriceId: null,
    mercadoPagoPlanId: null,
    isActive: true,
  });
  mocks.prisma.tenant.findUnique.mockResolvedValue({
    id: "tenant-1",
    slug: "tenant-a",
    subscription: {
      id: "subscription-1",
      status: "TRIAL",
    },
  });
  mocks.prisma.user.findFirst.mockResolvedValue({
    email: "admin@tenant.test",
  });
  mocks.prisma.tenantSubscription.upsert.mockResolvedValue({
    id: "subscription-1",
  });
}

function checkoutInput() {
  return {
    tenantId: "tenant-1",
    tenantSlug: "tenant-a",
    plan: "PROFESSIONAL" as const,
    provider: "MERCADO_PAGO" as const,
    payerEmail: "admin@tenant.test",
    successUrl: "https://stockpro.test/app/billing?checkout=success",
    cancelUrl: "https://stockpro.test/app/billing?checkout=cancel",
  };
}

function signedMercadoPagoRequest(rawBody: string, dataId: string) {
  const requestId = "mp-request-1";
  const ts = String(Date.now());
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const hash = createHmac("sha256", "mp-webhook-secret")
    .update(manifest)
    .digest("hex");

  return new Request("https://stockpro.test/api/webhooks/mercadopago", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-id": requestId,
      "x-signature": `ts=${ts},v1=${hash}`,
    },
    body: rawBody,
  });
}

describe("Mercado Pago billing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMercadoPagoEnv();
    process.env.MERCADO_PAGO_ACCESS_TOKEN = "TEST_ACCESS_TOKEN";
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = "mp-webhook-secret";
    process.env.MERCADO_PAGO_WEBHOOK_TOLERANCE_MS = "600000";
  });

  afterEach(() => {
    resetMercadoPagoEnv();
  });

  it("createTenantCheckoutSession cria preapproval pendente e persiste provider/subscription no tenant", async () => {
    mockCheckoutDatabase();
    mocks.preApprovalCreate.mockResolvedValue({
      id: "preapproval-1",
      init_point: "https://www.mercadopago.com.br/subscriptions/checkout",
    });

    const { createTenantCheckoutSession } = await import(
      "../src/lib/billing/service"
    );

    const checkout = await createTenantCheckoutSession(checkoutInput());

    expect(checkout).toMatchObject({
      provider: "MERCADO_PAGO",
      checkoutUrl: "https://www.mercadopago.com.br/subscriptions/checkout",
      redirectUrl: "https://www.mercadopago.com.br/subscriptions/checkout",
      providerSubscriptionId: "preapproval-1",
    });

    expect(mocks.preApprovalCreate).toHaveBeenCalledWith({
      body: expect.objectContaining({
        external_reference:
          "tenant:tenant-1;slug:tenant-a;plan:PROFESSIONAL",
        payer_email: "admin@tenant.test",
        back_url: "https://stockpro.test/app/billing?checkout=success",
        reason: "Pro",
        status: "pending",
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: 79,
          currency_id: "BRL",
        },
      }),
      requestOptions: {
        idempotencyKey: expect.any(String),
      },
    });

    const firstCall = mocks.preApprovalCreate.mock.calls[0]?.[0];

    expect(firstCall.body).not.toHaveProperty("preapproval_plan_id");

    expect(mocks.prisma.tenantSubscription.upsert).toHaveBeenCalledWith({
      where: { tenantId: "tenant-1" },
      create: expect.objectContaining({
        tenantId: "tenant-1",
        planId: "plan-professional",
        status: "TRIAL",
        provider: "MERCADO_PAGO",
        providerSubscriptionId: "preapproval-1",
      }),
      update: expect.objectContaining({
        planId: "plan-professional",
        provider: "MERCADO_PAGO",
        providerSubscriptionId: "preapproval-1",
      }),
    });
  });

  it("falha com erro claro quando falta MERCADO_PAGO_ACCESS_TOKEN", async () => {
    mockCheckoutDatabase();
    delete process.env.MERCADO_PAGO_ACCESS_TOKEN;

    const { createTenantCheckoutSession } = await import(
      "../src/lib/billing/service"
    );

    await expect(createTenantCheckoutSession(checkoutInput())).rejects.toThrow(
      "Configure MERCADO_PAGO_ACCESS_TOKEN",
    );

    expect(mocks.preApprovalCreate).not.toHaveBeenCalled();
  });

  it("cria checkout mesmo sem MERCADO_PAGO_PLAN porque usa assinatura sem plano associado", async () => {
    mockCheckoutDatabase();
    delete process.env.MERCADO_PAGO_PLAN_PROFESSIONAL;

    mocks.preApprovalCreate.mockResolvedValue({
      id: "preapproval-1",
      init_point: "https://www.mercadopago.com.br/subscriptions/checkout",
    });

    const { createTenantCheckoutSession } = await import(
      "../src/lib/billing/service"
    );

    await expect(createTenantCheckoutSession(checkoutInput())).resolves.toMatchObject({
      provider: "MERCADO_PAGO",
      providerSubscriptionId: "preapproval-1",
    });

    expect(mocks.preApprovalCreate).toHaveBeenCalledTimes(1);
  });

  it("webhook com assinatura invalida retorna 401", async () => {
    const { POST } = await import("../src/app/api/webhooks/mercadopago/route");

    const response = await POST(
      new Request("https://stockpro.test/api/webhooks/mercadopago", {
        method: "POST",
        headers: {
          "x-request-id": "mp-request-1",
          "x-signature": "ts=1740000000000,v1=invalid",
        },
        body: JSON.stringify({
          type: "preapproval",
          data: { id: "preapproval-1" },
        }),
      }),
      undefined,
    );

    expect(response.status).toBe(401);
  });

  it("webhook de preapproval autorizada ativa a TenantSubscription", async () => {
    const { POST } = await import("../src/app/api/webhooks/mercadopago/route");

    const rawBody = JSON.stringify({
      id: "event-preapproval-1",
      type: "preapproval",
      action: "updated",
      data: { id: "preapproval-1" },
    });

    mocks.preApprovalGet.mockResolvedValue({
      id: "preapproval-1",
      status: "authorized",
      external_reference: "tenant:tenant-1;slug:tenant-a;plan:PROFESSIONAL",
      payer_id: 123456,
      next_payment_date: "2026-06-15T00:00:00.000Z",
    });

    mocks.prisma.tenant.findUnique.mockResolvedValue({ id: "tenant-1" });
    mocks.prisma.subscriptionPlan.findUnique.mockResolvedValue({
      id: "plan-professional",
    });
    mocks.prisma.paymentEvent.upsert.mockResolvedValue({
      id: "payment-event-1",
    });
    mocks.prisma.tenantSubscription.findUnique.mockResolvedValue({
      planId: "plan-trial",
    });
    mocks.prisma.tenantSubscription.upsert.mockResolvedValue({
      id: "subscription-1",
      status: "ACTIVE",
    });

    const response = await POST(
      signedMercadoPagoRequest(rawBody, "preapproval-1"),
      undefined,
    );

    expect(response.status).toBe(200);

    expect(mocks.preApprovalGet).toHaveBeenCalledWith({ id: "preapproval-1" });

    expect(mocks.prisma.tenantSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "tenant-1" },
        update: expect.objectContaining({
          planId: "plan-professional",
          status: "ACTIVE",
          provider: "MERCADO_PAGO",
          providerCustomerId: "123456",
          providerSubscriptionId: "preapproval-1",
          blockedAt: null,
          cancelAtPeriodEnd: false,
        }),
      }),
    );
  });
});