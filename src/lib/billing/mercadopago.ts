import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import {
  MercadoPagoConfig,
  Payment,
  PreApproval,
  Preference,
} from "mercadopago";
import {
  AppError,
  ConfigurationError,
  UnauthorizedError,
} from "@/lib/http-errors";

type MercadoPagoPlanCode = "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

type MercadoPagoCheckoutInput = {
  tenantId: string;
  tenantSlug: string;
  plan: MercadoPagoPlanCode;
  planName: string;
  amountCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  payerEmail?: string;
};

type MercadoPagoCheckoutResponse = {
  provider: "MERCADO_PAGO";
  checkoutUrl: string;
  providerPreferenceId?: string;
  providerSubscriptionId?: string;
};

type MercadoPagoWebhookEvent = {
  provider: "MERCADO_PAGO";
  providerEventId: string;
  eventType: string;
  plan?: MercadoPagoPlanCode;
  tenantId?: string;
  tenantSlug?: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  subscriptionStatus?: "TRIAL" | "ACTIVE" | "BLOCKED" | "CANCELED";
  currentPeriodEnd?: Date;
  payload: unknown;
};

type JsonObject = Record<string, unknown>;

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new ConfigurationError(`Configure ${name} para habilitar Mercado Pago.`);
  }

  return value;
}

function getMercadoPagoClient() {
  return new MercadoPagoConfig({
    accessToken: requireEnv("MERCADO_PAGO_ACCESS_TOKEN"),
    options: { timeout: 5000 },
  });
}

function currencyId(currency: string) {
  return currency.toUpperCase() === "BRL" ? "BRL" : currency.toUpperCase();
}

function amountFromCents(amountCents: number) {
  return Number((amountCents / 100).toFixed(2));
}

function getWebhookUrl(successUrl: string) {
  return (
    process.env.MERCADO_PAGO_WEBHOOK_URL ??
    `${new URL(successUrl).origin}/api/webhooks/mercadopago`
  );
}

function externalReference(input: MercadoPagoCheckoutInput) {
  return [
    `tenant:${input.tenantId}`,
    `slug:${input.tenantSlug}`,
    `plan:${input.plan}`,
  ].join(";");
}

function parseExternalReference(value: string | null | undefined) {
  if (!value) {
    return {};
  }

  return value.split(";").reduce<Record<string, string>>((result, part) => {
    const [key, ...rest] = part.split(":");
    const text = rest.join(":");

    if (key && text) {
      result[key] = text;
    }

    return result;
  }, {});
}

function parsePaidPlan(value: string | null | undefined) {
  if (
    value === "STARTER" ||
    value === "PROFESSIONAL" ||
    value === "ENTERPRISE"
  ) {
    return value;
  }

  return undefined;
}

export async function createMercadoPagoPreference(
  input: MercadoPagoCheckoutInput,
): Promise<MercadoPagoCheckoutResponse> {
  if (input.amountCents <= 0) {
    throw new AppError(
      "BILLING_PRICE_INVALID",
      "Plano Mercado Pago precisa ter preco maior que zero.",
      500,
      { plan: input.plan },
    );
  }

  const preference = new Preference(getMercadoPagoClient());
  const result = await preference.create({
    body: {
      external_reference: externalReference(input),
      metadata: {
        tenantId: input.tenantId,
        tenantSlug: input.tenantSlug,
        plan: input.plan,
      },
      notification_url: getWebhookUrl(input.successUrl),
      auto_return: "approved",
      back_urls: {
        success: input.successUrl,
        pending: input.successUrl,
        failure: input.cancelUrl,
      },
      items: [
        {
          id: input.plan,
          title: input.planName,
          quantity: 1,
          currency_id: currencyId(input.currency),
          unit_price: amountFromCents(input.amountCents),
        },
      ],
      payer: input.payerEmail ? { email: input.payerEmail } : undefined,
    },
    requestOptions: { idempotencyKey: randomUUID() },
  });

  const checkoutUrl = result.init_point ?? result.sandbox_init_point;

  if (!checkoutUrl) {
    throw new AppError(
      "BILLING_CHECKOUT_FAILED",
      "Mercado Pago nao retornou URL de checkout.",
      502,
    );
  }

  return {
    provider: "MERCADO_PAGO",
    checkoutUrl,
    providerPreferenceId: result.id,
  };
}

export async function createMercadoPagoRecurringSubscription(
  input: MercadoPagoCheckoutInput,
): Promise<MercadoPagoCheckoutResponse> {
  if (!input.payerEmail) {
    throw new AppError(
      "BILLING_PAYER_EMAIL_REQUIRED",
      "Informe o email do pagador para criar assinatura recorrente.",
      400,
    );
  }

  if (input.amountCents <= 0) {
    throw new AppError(
      "BILLING_PRICE_INVALID",
      "Plano Mercado Pago precisa ter preco maior que zero.",
      500,
      { plan: input.plan },
    );
  }

  const preApproval = new PreApproval(getMercadoPagoClient());
  const result = await preApproval.create({
    body: {
      reason: input.planName,
      external_reference: externalReference(input),
      payer_email: input.payerEmail,
      back_url: input.successUrl,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: amountFromCents(input.amountCents),
        currency_id: currencyId(input.currency),
      },
      status: "pending",
    },
    requestOptions: { idempotencyKey: randomUUID() },
  });

  if (!result.init_point) {
    throw new AppError(
      "BILLING_SUBSCRIPTION_FAILED",
      "Mercado Pago nao retornou URL de assinatura.",
      502,
    );
  }

  return {
    provider: "MERCADO_PAGO",
    checkoutUrl: result.init_point,
    providerSubscriptionId: result.id,
  };
}

function parseJson(rawBody: string): JsonObject {
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as JsonObject) : {};
  } catch {
    return {};
  }
}

function nestedObject(value: unknown): JsonObject {
  return value && typeof value === "object" ? (value as JsonObject) : {};
}

function stringValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return undefined;
}

function getWebhookDataId(payload: JsonObject, request: Request) {
  const url = new URL(request.url);
  const data = nestedObject(payload.data);

  return (
    url.searchParams.get("data.id") ??
    url.searchParams.get("id") ??
    stringValue(data.id) ??
    stringValue(payload.id)
  );
}

function normalizeDataId(dataId: string) {
  return /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
}

function getSignatureParts(signature: string) {
  return signature.split(",").reduce<Record<string, string>>((parts, part) => {
    const [key, ...rest] = part.split("=");
    const value = rest.join("=");

    if (key && value) {
      parts[key.trim()] = value.trim();
    }

    return parts;
  }, {});
}

export function verifyMercadoPagoWebhookSignature(
  rawBody: string,
  request: Request,
) {
  const secret = requireEnv("MERCADO_PAGO_WEBHOOK_SECRET");
  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");

  if (!xSignature || !xRequestId) {
    throw new UnauthorizedError("Webhook Mercado Pago sem assinatura.");
  }

  const payload = parseJson(rawBody);
  const dataId = getWebhookDataId(payload, request);
  const parts = getSignatureParts(xSignature);
  const ts = parts.ts;
  const receivedHash = parts.v1;

  if (!ts || !receivedHash) {
    throw new UnauthorizedError("Assinatura Mercado Pago malformada.");
  }

  const manifest = [
    dataId ? `id:${normalizeDataId(dataId)};` : "",
    `request-id:${xRequestId};`,
    `ts:${ts};`,
  ].join("");

  const expectedHash = createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");
  const expected = Buffer.from(expectedHash, "hex");
  const received = Buffer.from(receivedHash, "hex");

  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    throw new UnauthorizedError("Assinatura Mercado Pago invalida.");
  }
}

function addOneMonth(date: Date) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + 1);
  return nextDate;
}

function mapPaymentStatus(status: string | undefined) {
  if (status === "approved" || status === "authorized") {
    return "ACTIVE" as const;
  }

  if (
    status === "rejected" ||
    status === "cancelled" ||
    status === "refunded" ||
    status === "charged_back"
  ) {
    return "BLOCKED" as const;
  }

  return undefined;
}

function mapPreApprovalStatus(status: string | undefined) {
  if (status === "authorized") {
    return "ACTIVE" as const;
  }

  if (status === "cancelled") {
    return "CANCELED" as const;
  }

  if (status === "paused") {
    return "BLOCKED" as const;
  }

  return undefined;
}

function eventTopic(payload: JsonObject) {
  const data = nestedObject(payload.data);
  return [
    stringValue(payload.type),
    stringValue(payload.action),
    stringValue(payload.topic),
    stringValue(data.type),
  ]
    .filter(Boolean)
    .join(".");
}

export async function parseMercadoPagoWebhook(
  rawBody: string,
  request: Request,
): Promise<MercadoPagoWebhookEvent> {
  verifyMercadoPagoWebhookSignature(rawBody, request);

  const payload = parseJson(rawBody);
  const dataId = getWebhookDataId(payload, request);
  const topic = eventTopic(payload);
  const providerEventId =
    stringValue(payload.id) ??
    stringValue(nestedObject(payload.data).id) ??
    dataId ??
    randomUUID();

  if (dataId && topic.includes("preapproval")) {
    const preApproval = await new PreApproval(getMercadoPagoClient()).get({
      id: dataId,
    });
    const reference = parseExternalReference(preApproval.external_reference);

    return {
      provider: "MERCADO_PAGO",
      providerEventId,
      eventType: topic || "preapproval",
      plan: parsePaidPlan(reference.plan),
      tenantId: reference.tenant,
      tenantSlug: reference.slug,
      providerCustomerId: preApproval.payer_id
        ? String(preApproval.payer_id)
        : preApproval.payer_email,
      providerSubscriptionId: preApproval.id,
      subscriptionStatus: mapPreApprovalStatus(preApproval.status),
      currentPeriodEnd: preApproval.next_payment_date
        ? new Date(preApproval.next_payment_date)
        : undefined,
      payload: { notification: payload, resource: preApproval },
    };
  }

  if (dataId && topic.includes("payment")) {
    const payment = await new Payment(getMercadoPagoClient()).get({
      id: dataId,
    });
    const reference = parseExternalReference(payment.external_reference);
    const periodBase = payment.date_approved
      ? new Date(payment.date_approved)
      : new Date();

    return {
      provider: "MERCADO_PAGO",
      providerEventId,
      eventType: topic || "payment",
      plan: parsePaidPlan(
        stringValue(nestedObject(payment.metadata).plan) ?? reference.plan,
      ),
      tenantId:
        stringValue(nestedObject(payment.metadata).tenantId) ?? reference.tenant,
      tenantSlug:
        stringValue(nestedObject(payment.metadata).tenantSlug) ?? reference.slug,
      providerCustomerId: payment.payer?.id,
      providerSubscriptionId: payment.id ? String(payment.id) : undefined,
      subscriptionStatus: mapPaymentStatus(payment.status),
      currentPeriodEnd:
        payment.status === "approved" ? addOneMonth(periodBase) : undefined,
      payload: { notification: payload, resource: payment },
    };
  }

  return {
    provider: "MERCADO_PAGO",
    providerEventId,
    eventType: topic || "unknown",
    tenantId: stringValue(payload.tenantId),
    tenantSlug: stringValue(payload.tenantSlug),
    payload,
  };
}
