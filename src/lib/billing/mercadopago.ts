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
  mercadoPagoPlanId?: string | null;
  successUrl: string;
  cancelUrl: string;
  payerEmail?: string;
};

type MercadoPagoCheckoutResponse = {
  provider: "MERCADO_PAGO";
  checkoutUrl: string;
  redirectUrl?: string;
  providerPreferenceId?: string;
  providerSubscriptionId?: string;
  providerHttpStatus?: number;
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

const DEFAULT_WEBHOOK_TOLERANCE_MS = 10 * 60 * 1000;
const DEFAULT_SUBSCRIPTION_DURATION_YEARS = 10;

type SafeMercadoPagoErrorPayload = {
  message?: string;
  status?: number;
  cause?: unknown;
  error?: string;
};

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
    options: { timeout: 10000 },
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

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = value ? Number(value) : fallback;

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getSubscriptionEndDate() {
  const years = parsePositiveInteger(
    process.env.MERCADO_PAGO_SUBSCRIPTION_YEARS,
    DEFAULT_SUBSCRIPTION_DURATION_YEARS,
  );
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + years);

  return endDate.toISOString();
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

function safeText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function redactMercadoPagoValue(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return "[truncated]";
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactMercadoPagoValue(item, depth + 1));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !/token|secret|authorization|cookie|jwt/i.test(key))
        .map(([key, item]) => [
          key,
          redactMercadoPagoValue(item, depth + 1),
        ]),
    );
  }

  return String(value);
}

function mercadoPagoErrorPayload(error: unknown): SafeMercadoPagoErrorPayload {
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const apiResponse = record.api_response as Record<string, unknown> | undefined;

    return {
      message: safeText(record.message),
      status: safeNumber(record.status) ?? safeNumber(apiResponse?.status),
      cause:
        record.cause === undefined
          ? undefined
          : redactMercadoPagoValue(record.cause),
      error: safeText(record.error),
    };
  }

  return { message: String(error) };
}

type PreferenceCreateResult = {
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
};

function getPreferenceCheckoutUrl(result: PreferenceCreateResult) {
  return result.init_point ?? result.sandbox_init_point;
}

type PreApprovalCreateResult = {
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
  status?: string;
  api_response?: {
    status?: number;
  };
};

function getPreApprovalCheckoutUrl(result: PreApprovalCreateResult) {
  return result.init_point ?? result.sandbox_init_point;
}

function assertCheckoutUrl(value: string | undefined, message: string) {
  if (!value) {
    throw new AppError("BILLING_CHECKOUT_URL_MISSING", message, 502);
  }

  try {
    const parsed = new URL(value);

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("invalid protocol");
    }
  } catch {
    throw new AppError(
      "BILLING_CHECKOUT_URL_INVALID",
      "Mercado Pago retornou uma URL de checkout invalida.",
      502,
    );
  }

  return value;
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

  const result = (await preference.create({
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
  })) as PreferenceCreateResult;

  const checkoutUrl = getPreferenceCheckoutUrl(result);

  const validCheckoutUrl = assertCheckoutUrl(
    checkoutUrl,
    "Mercado Pago nao retornou URL de checkout.",
  );

  return {
    provider: "MERCADO_PAGO",
    checkoutUrl: validCheckoutUrl,
    redirectUrl: validCheckoutUrl,
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
  const amount = amountFromCents(input.amountCents);

  try {
    const result = (await preApproval.create({
      body: {
        reason: input.planName,
        external_reference: externalReference(input),
        payer_email: input.payerEmail,
        back_url: input.successUrl,
        status: "pending",
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          end_date: getSubscriptionEndDate(),
          transaction_amount: amount,
          currency_id: currencyId(input.currency),
        },
      },
      requestOptions: { idempotencyKey: randomUUID() },
    })) as PreApprovalCreateResult;

    const checkoutUrl = assertCheckoutUrl(
      getPreApprovalCheckoutUrl(result),
      "Mercado Pago nao retornou URL de assinatura.",
    );

    const providerSubscriptionId = result.id;

    if (!providerSubscriptionId) {
      throw new AppError(
        "BILLING_SUBSCRIPTION_ID_MISSING",
        "Mercado Pago nao retornou identificador da assinatura.",
        502,
      );
    }

    return {
      provider: "MERCADO_PAGO",
      checkoutUrl,
      redirectUrl: checkoutUrl,
      providerSubscriptionId,
      providerHttpStatus: result.api_response?.status,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "MERCADO_PAGO_PREAPPROVAL_FAILED",
      "Mercado Pago recusou a criacao da assinatura.",
      502,
      mercadoPagoErrorPayload(error),
    );
  }
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

function getWebhookToleranceMs() {
  const rawValue = process.env.MERCADO_PAGO_WEBHOOK_TOLERANCE_MS;
  const parsed = rawValue ? Number(rawValue) : DEFAULT_WEBHOOK_TOLERANCE_MS;

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_WEBHOOK_TOLERANCE_MS;
}

function assertRecentWebhookTimestamp(ts: string) {
  const rawTimestamp = Number(ts);

  if (!Number.isFinite(rawTimestamp)) {
    throw new UnauthorizedError("Timestamp Mercado Pago invalido.");
  }

  const timestamp =
    rawTimestamp < 1_000_000_000_000 ? rawTimestamp * 1000 : rawTimestamp;
  const drift = Math.abs(Date.now() - timestamp);

  if (drift > getWebhookToleranceMs()) {
    throw new UnauthorizedError("Assinatura Mercado Pago expirada.");
  }
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

  assertRecentWebhookTimestamp(ts);

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

  if (status === "cancelled" || status === "canceled") {
    return "CANCELED" as const;
  }

  if (
    status === "rejected" ||
    status === "expired" ||
    status === "refunded" ||
    status === "charged_back"
  ) {
    return "BLOCKED" as const;
  }

  return undefined;
}

function mapPreApprovalStatus(status: string | undefined) {
  if (status === "authorized" || status === "active") {
    return "ACTIVE" as const;
  }

  if (status === "pending") {
    return "TRIAL" as const;
  }

  if (status === "cancelled" || status === "canceled") {
    return "CANCELED" as const;
  }

  if (status === "paused" || status === "expired" || status === "rejected") {
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

function metadataSubscriptionId(metadata: JsonObject) {
  return (
    stringValue(metadata.preapproval_id) ??
    stringValue(metadata.preapprovalId) ??
    stringValue(metadata.subscription_id) ??
    stringValue(metadata.subscriptionId)
  );
}

export async function parseMercadoPagoWebhook(
  rawBody: string,
  request: Request,
): Promise<MercadoPagoWebhookEvent> {
  verifyMercadoPagoWebhookSignature(rawBody, request);

  const payload = parseJson(rawBody);
  const dataId = getWebhookDataId(payload, request);
  const topic = eventTopic(payload);
  const providerEventId = [
    topic || "mercadopago",
    stringValue(payload.id) ??
      stringValue(nestedObject(payload.data).id) ??
      dataId ??
      randomUUID(),
  ].join(":");

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

    const metadata = nestedObject(payment.metadata);
    const reference = parseExternalReference(payment.external_reference);
    const periodBase = payment.date_approved
      ? new Date(payment.date_approved)
      : new Date();

    return {
      provider: "MERCADO_PAGO",
      providerEventId,
      eventType: topic || "payment",
      plan: parsePaidPlan(
        stringValue(metadata.plan) ?? reference.plan,
      ),
      tenantId:
        stringValue(metadata.tenantId) ?? reference.tenant,
      tenantSlug:
        stringValue(metadata.tenantSlug) ?? reference.slug,
      providerCustomerId: payment.payer?.id,
      providerSubscriptionId: metadataSubscriptionId(metadata),
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
