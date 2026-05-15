import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  paymentGet: vi.fn(),
  preApprovalGet: vi.fn(),
  getTenantIdentityFromRequest: vi.fn(),
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
      findFirst: vi.fn(),
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

vi.mock("@/lib/tenant-context", () => ({
  getTenantIdentityFromRequest: mocks.getTenantIdentityFromRequest,
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
      get: mocks.preApprovalGet,
    };
  }),
}));

const mercadoPagoEnv = [
  "APP_URL",
  "NEXT_PUBLIC_APP_URL",
  "VERCEL_URL",
  "MERCADO_PAGO_ACCESS_TOKEN",
  "MERCADO_PAGO_PLAN_STARTER",
  "MERCADO_PAGO_PLAN_PROFESSIONAL",
  "MERCADO_PAGO_PLAN_ENTERPRISE",
  "MERCADO_PAGO_WEBHOOK_SECRET",
  "MERCADO_PAGO_WEBHOOK_TOLERANCE_MS",
  "MERCADO_PAGO_WEBHOOK_URL",
] as const;

function resetMercadoPagoEnv() {
  for (const key of mercadoPagoEnv) {
    delete process.env[key];
  }
}

function mercadoPagoResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function mockMercadoPagoPreferenceSuccess() {
  mocks.fetch.mockResolvedValue(
    mercadoPagoResponse(201, {
      id: "preference-1",
      init_point:
        "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=preference-1",
      sandbox_init_point:
        "https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=preference-1",
      external_reference: "tenant:tenant-1;slug:tenant-a;plan:PROFESSIONAL",
    }),
  );
}

function lastMercadoPagoPreferencePayload() {
  const init = mocks.fetch.mock.calls.at(-1)?.[1] as RequestInit | undefined;
  const body = init?.body;

  if (typeof body !== "string") {
    throw new Error("Mercado Pago fetch body missing.");
  }

  return JSON.parse(body) as Record<string, unknown>;
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
  mocks.prisma.tenantSubscription.findUnique.mockResolvedValue({
    tenantId: "tenant-1",
    planId: "plan-professional",
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
    vi.stubGlobal("fetch", mocks.fetch);
    resetMercadoPagoEnv();
    process.env.MERCADO_PAGO_ACCESS_TOKEN = "TEST-ACCESS-TOKEN";
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = "mp-webhook-secret";
    process.env.MERCADO_PAGO_WEBHOOK_TOLERANCE_MS = "600000";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetMercadoPagoEnv();
  });

  it("createTenantCheckoutSession cria Preference Checkout Pro com payload correto", async () => {
    mockCheckoutDatabase();
    mockMercadoPagoPreferenceSuccess();

    const { createTenantCheckoutSession } = await import(
      "../src/lib/billing/service"
    );

    const checkout = await createTenantCheckoutSession(checkoutInput());

    expect(checkout).toMatchObject({
      provider: "MERCADO_PAGO",
      checkoutUrl:
        "https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=preference-1",
      redirectUrl:
        "https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=preference-1",
      providerPreferenceId: "preference-1",
      providerHttpStatus: 201,
    });
    expect(checkout.providerSubscriptionId).toBeUndefined();

    const payload = lastMercadoPagoPreferencePayload();

    expect(mocks.fetch).toHaveBeenCalledWith(
      "https://api.mercadopago.com/checkout/preferences",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer TEST-ACCESS-TOKEN",
          "Content-Type": "application/json",
        }),
      }),
    );
    expect(
      mocks.fetch.mock.calls.some(([url]) => String(url).includes("/preapproval")),
    ).toBe(false);

    expect(payload).toMatchObject({
      external_reference: "tenant:tenant-1;slug:tenant-a;plan:PROFESSIONAL",
      metadata: {
        tenantId: "tenant-1",
        tenantSlug: "tenant-a",
        plan: "PROFESSIONAL",
      },
      notification_url: "https://stockpro.test/api/webhooks/mercadopago",
      auto_return: "approved",
      back_urls: {
        success: "https://stockpro.test/app/billing?checkout=success",
        pending: "https://stockpro.test/app/billing?checkout=success",
        failure: "https://stockpro.test/app/billing?checkout=cancel",
      },
      items: [
        {
          id: "PROFESSIONAL",
          title: "Pro",
          quantity: 1,
          currency_id: "BRL",
          unit_price: 79,
        },
      ],
      payer: {
        email: "admin@tenant.test",
      },
    });

    expect(payload).not.toHaveProperty("preapproval_plan_id");
    expect(payload).not.toHaveProperty("auto_recurring");

    expect(mocks.prisma.tenantSubscription.upsert).toHaveBeenCalledWith({
      where: { tenantId: "tenant-1" },
      create: expect.objectContaining({
        tenantId: "tenant-1",
        planId: "plan-professional",
        status: "TRIAL",
        provider: "MERCADO_PAGO",
        providerSubscriptionId: undefined,
      }),
      update: expect.objectContaining({
        planId: "plan-professional",
        provider: "MERCADO_PAGO",
        providerSubscriptionId: undefined,
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

    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("cria preference sem MERCADO_PAGO_PLAN porque Checkout Pro V1 nao usa plano associado", async () => {
    mockCheckoutDatabase();
    delete process.env.MERCADO_PAGO_PLAN_PROFESSIONAL;
    mockMercadoPagoPreferenceSuccess();

    const { createTenantCheckoutSession } = await import(
      "../src/lib/billing/service"
    );

    await expect(createTenantCheckoutSession(checkoutInput())).resolves.toMatchObject({
      provider: "MERCADO_PAGO",
      providerPreferenceId: "preference-1",
    });

    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it("inclui payer somente quando email esta disponivel", async () => {
    mockCheckoutDatabase();
    mocks.prisma.user.findFirst.mockResolvedValue(null);
    mockMercadoPagoPreferenceSuccess();

    const { createTenantCheckoutSession } = await import(
      "../src/lib/billing/service"
    );

    await createTenantCheckoutSession({
      ...checkoutInput(),
      payerEmail: undefined,
    });

    expect(lastMercadoPagoPreferencePayload()).not.toHaveProperty("payer");
  });

  it("captura e loga body completo quando Mercado Pago retorna 400", async () => {
    mockCheckoutDatabase();
    mocks.fetch.mockResolvedValue(
      mercadoPagoResponse(400, {
        message: "Parameters passed are invalid",
        error: "bad_request",
        cause: [
          {
            code: "invalid_items",
            description: "items.0.unit_price must be a positive number",
          },
        ],
      }),
    );

    const { createTenantCheckoutSession } = await import(
      "../src/lib/billing/service"
    );

    await expect(createTenantCheckoutSession(checkoutInput())).rejects.toThrow(
      "Mercado Pago recusou a criacao do checkout.",
    );

    expect(mocks.logger.error).toHaveBeenCalledWith(
      "mercado_pago.preference.failed",
      expect.objectContaining({
        tenantId: "tenant-1",
        tenantSlug: "tenant-a",
        plan: "PROFESSIONAL",
        payerEmail: "ad***@tenant.test",
        status: 400,
        mercadoPagoMessage: "Parameters passed are invalid",
        mercadoPagoError: "bad_request",
        responseBody: expect.objectContaining({
          message: "Parameters passed are invalid",
          error: "bad_request",
          cause: expect.any(Array),
        }),
      }),
    );
  });

  it("rota create-checkout usa tenant da sessao e ignora tenant da query", async () => {
    mockCheckoutDatabase();
    mocks.getTenantIdentityFromRequest.mockResolvedValue({
      id: "tenant-1",
      slug: "tenant-a",
      name: "Tenant A",
    });
    mockMercadoPagoPreferenceSuccess();

    const { POST } = await import(
      "../src/app/api/billing/create-checkout/route"
    );

    const response = await POST(
      new Request(
        "https://stockpro.test/api/billing/create-checkout?tenant=tenant-b",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            provider: "MERCADO_PAGO",
            plan: "PROFESSIONAL",
            payerEmail: "admin@tenant.test",
          }),
        },
      ),
      undefined,
    );

    expect(response.status).toBe(201);
    expect(lastMercadoPagoPreferencePayload()).toMatchObject({
      external_reference: "tenant:tenant-1;slug:tenant-a;plan:PROFESSIONAL",
      back_urls: {
        success: "https://stockpro.test/app/billing?checkout=success",
      },
    });
  });

  it("rota create-checkout sem sessao falha e nao chama Mercado Pago", async () => {
    const { UnauthorizedError } = await import("../src/lib/http-errors");
    mocks.getTenantIdentityFromRequest.mockRejectedValue(
      new UnauthorizedError("Sessao ausente ou expirada."),
    );

    const { POST } = await import(
      "../src/app/api/billing/create-checkout/route"
    );

    const response = await POST(
      new Request("https://stockpro.test/api/billing/create-checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: "MERCADO_PAGO",
          plan: "PROFESSIONAL",
        }),
      }),
      undefined,
    );

    expect(response.status).toBe(401);
    expect(mocks.fetch).not.toHaveBeenCalled();
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
          type: "payment",
          data: { id: "123456" },
        }),
      }),
      undefined,
    );

    expect(response.status).toBe(401);
  });

  it("webhook de pagamento aprovado ativa a TenantSubscription por 30 dias", async () => {
    const { POST } = await import("../src/app/api/webhooks/mercadopago/route");

    const rawBody = JSON.stringify({
      id: "event-payment-1",
      type: "payment",
      action: "payment.created",
      data: { id: "123456" },
    });

    mocks.paymentGet.mockResolvedValue({
      id: 123456,
      status: "approved",
      date_approved: "2026-05-15T12:00:00.000Z",
      external_reference: "tenant:tenant-1;slug:tenant-a;plan:PROFESSIONAL",
      payer: { id: "payer-1" },
      metadata: {},
    });

    mocks.prisma.tenant.findUnique.mockResolvedValue({
      id: "tenant-1",
      slug: "tenant-a",
    });
    mocks.prisma.subscriptionPlan.findUnique.mockResolvedValue({
      id: "plan-professional",
    });
    mocks.prisma.paymentEvent.upsert.mockResolvedValue({
      id: "payment-event-1",
    });
    mocks.prisma.tenantSubscription.findUnique.mockResolvedValue({
      tenantId: "tenant-1",
      planId: "plan-trial",
    });
    mocks.prisma.tenantSubscription.upsert.mockResolvedValue({
      id: "subscription-1",
      status: "ACTIVE",
    });

    const response = await POST(
      signedMercadoPagoRequest(rawBody, "123456"),
      undefined,
    );

    expect(response.status).toBe(200);
    expect(mocks.paymentGet).toHaveBeenCalledWith({ id: "123456" });
    expect(mocks.prisma.tenantSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "tenant-1" },
        update: expect.objectContaining({
          planId: "plan-professional",
          status: "ACTIVE",
          provider: "MERCADO_PAGO",
          providerCustomerId: "payer-1",
          currentPeriodStart: expect.any(Date),
          currentPeriodEnd: new Date("2026-06-14T12:00:00.000Z"),
          blockedAt: null,
          cancelAtPeriodEnd: false,
        }),
      }),
    );
  });

  it("webhook de pagamento rejeitado nao ativa a TenantSubscription", async () => {
    const { POST } = await import("../src/app/api/webhooks/mercadopago/route");

    const rawBody = JSON.stringify({
      id: "event-payment-2",
      type: "payment",
      action: "payment.updated",
      data: { id: "654321" },
    });

    mocks.paymentGet.mockResolvedValue({
      id: 654321,
      status: "rejected",
      external_reference: "tenant:tenant-1;slug:tenant-a;plan:PROFESSIONAL",
      payer: { id: "payer-1" },
      metadata: {},
    });

    mocks.prisma.tenant.findUnique.mockResolvedValue({
      id: "tenant-1",
      slug: "tenant-a",
    });
    mocks.prisma.subscriptionPlan.findUnique.mockResolvedValue({
      id: "plan-professional",
    });
    mocks.prisma.paymentEvent.upsert.mockResolvedValue({
      id: "payment-event-2",
    });
    mocks.prisma.tenantSubscription.findUnique.mockResolvedValue({
      tenantId: "tenant-1",
      planId: "plan-trial",
    });
    mocks.prisma.tenantSubscription.upsert.mockResolvedValue({
      id: "subscription-1",
      status: "BLOCKED",
    });

    const response = await POST(
      signedMercadoPagoRequest(rawBody, "654321"),
      undefined,
    );

    expect(response.status).toBe(200);
    expect(mocks.prisma.tenantSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "tenant-1" },
        update: expect.objectContaining({
          status: "BLOCKED",
          provider: "MERCADO_PAGO",
          currentPeriodEnd: undefined,
          blockedAt: expect.any(Date),
        }),
      }),
    );
    expect(
      mocks.prisma.tenantSubscription.upsert.mock.calls.at(-1)?.[0].update.status,
    ).not.toBe("ACTIVE");
  });

  it("webhook legado de preapproval autorizada ainda ativa a TenantSubscription", async () => {
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

    mocks.prisma.tenant.findUnique.mockResolvedValue({
      id: "tenant-1",
      slug: "tenant-a",
    });
    mocks.prisma.subscriptionPlan.findUnique.mockResolvedValue({
      id: "plan-professional",
    });
    mocks.prisma.paymentEvent.upsert.mockResolvedValue({
      id: "payment-event-1",
    });
    mocks.prisma.tenantSubscription.findUnique.mockResolvedValue({
      tenantId: "tenant-1",
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
          currentPeriodEnd: new Date("2026-06-15T00:00:00.000Z"),
          blockedAt: null,
          cancelAtPeriodEnd: false,
        }),
      }),
    );
  });
});
