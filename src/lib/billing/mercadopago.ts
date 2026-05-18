import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { MercadoPagoConfig, Payment, PreApproval } from "mercadopago";
import {
  AppError,
  ConfigurationError,
  UnauthorizedError,
} from "@/lib/http-errors";
import { logger } from "@/lib/logger";

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
type SafeLogValue =
  | string
  | number
  | boolean
  | null
  | SafeLogValue[]
  | { [key: string]: SafeLogValue | undefined };

const DEFAULT_WEBHOOK_TOLERANCE_MS = 10 * 60 * 1000;
const MERCADO_PAGO_PREFERENCE_URL =
  "https://api.mercadopago.com/checkout/preferences";

type SafeMercadoPagoErrorPayload = {
  message?: string;
  status?: number;
  cause?: SafeLogValue;
  error?: string;
  responseBody?: SafeLogValue;
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

function maskEmail(email: string) {
  const [localPart = "", domain = ""] = email.split("@");
  const visible = localPart.slice(0, 2);
  const maskedLocal = `${visible}${"*".repeat(Math.max(localPart.length - 2, 3))}`;

  return domain ? `${maskedLocal}@${domain}` : maskedLocal;
}

function assertPublicHttpsUrl(value: string, fieldName: string) {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new AppError(
      "BILLING_PUBLIC_URL_INVALID",
      `Configure ${fieldName} com uma URL HTTPS publica.`,
      500,
      { message: `${fieldName} invalida.` },
    );
  }

  if (parsed.protocol !== "https:") {
    throw new AppError(
      "BILLING_PUBLIC_URL_INVALID",
      `Configure ${fieldName} com uma URL HTTPS publica.`,
      500,
      {
        message: `${fieldName} precisa usar HTTPS para o Mercado Pago.`,
        cause: { protocol: parsed.protocol, origin: parsed.origin },
      },
    );
  }

  const hostname = parsed.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  ) {
    throw new AppError(
      "BILLING_PUBLIC_URL_INVALID",
      `Configure ${fieldName} com uma URL HTTPS publica.`,
      500,
      {
        message: `${fieldName} nao pode apontar para localhost.`,
        cause: { origin: parsed.origin },
      },
    );
  }
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

function redactMercadoPagoValue(
  value: unknown,
  depth = 0,
): SafeLogValue | undefined {
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
    return value
      .map((item) => redactMercadoPagoValue(item, depth + 1))
      .filter((item): item is SafeLogValue => item !== undefined);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !/token|secret|authorization|cookie|jwt/i.test(key))
        .map(([key, item]) => [
          key,
          redactMercadoPagoValue(item, depth + 1),
        ]),
    ) as { [key: string]: SafeLogValue | undefined };
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
      cause: redactMercadoPagoValue(record.cause),
      error: safeText(record.error),
      responseBody: redactMercadoPagoValue(record.responseBody),
    };
  }

  return { message: String(error) };
}

type PreferenceCreateResult = {
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
  external_reference?: string;
  api_response?: {
    status?: number;
  };
};

function isSandboxAccessToken(accessToken: string) {
  return accessToken.startsWith("TEST-");
}

function getPreferenceCheckoutUrl(
  result: PreferenceCreateResult,
  options: { preferSandbox: boolean },
) {
  return options.preferSandbox
    ? result.sandbox_init_point ?? result.init_point
    : result.init_point ?? result.sandbox_init_point;
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

type MercadoPagoPreferencePayload = {
  external_reference: string;
  metadata: {
    tenantId: string;
    tenantSlug: string;
    plan: MercadoPagoPlanCode;
  };
  notification_url: string;
  auto_return: "approved";
  back_urls: {
    success: string;
    pending: string;
    failure: string;
  };
  items: Array<{
    id: MercadoPagoPlanCode;
    title: string;
    quantity: 1;
    currency_id: string;
    unit_price: number;
  }>;
  payer?: {
    email: string;
  };
};

function buildMercadoPagoPreferencePayload(
  input: MercadoPagoCheckoutInput,
): MercadoPagoPreferencePayload {
  const amount = amountFromCents(input.amountCents);
  const currency = currencyId(input.currency);
  const notificationUrl = getWebhookUrl(input.successUrl);

  if (amount <= 0) {
    throw new AppError(
      "BILLING_PRICE_INVALID",
      "Plano Mercado Pago precisa ter preco maior que zero.",
      500,
      { plan: input.plan },
    );
  }

  if (currency !== "BRL") {
    throw new AppError(
      "BILLING_CURRENCY_INVALID",
      "Mercado Pago esta configurado para cobrancas em BRL.",
      500,
      { plan: input.plan, currency },
    );
  }

  assertPublicHttpsUrl(input.successUrl, "APP_URL");
  assertPublicHttpsUrl(input.cancelUrl, "APP_URL");
  assertPublicHttpsUrl(notificationUrl, "MERCADO_PAGO_WEBHOOK_URL");

  const payload: MercadoPagoPreferencePayload = {
    external_reference: externalReference(input),
    metadata: {
      tenantId: input.tenantId,
      tenantSlug: input.tenantSlug,
      plan: input.plan,
    },
    notification_url: notificationUrl,
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
        currency_id: currency,
        unit_price: amount,
      },
    ],
  };

  if (input.payerEmail) {
    payload.payer = { email: input.payerEmail };
  }

  return payload;
}

function mercadoPagoLogContext(input: MercadoPagoCheckoutInput) {
  return {
    tenantId: input.tenantId,
    tenantSlug: input.tenantSlug,
    provider: "MERCADO_PAGO",
    plan: input.plan,
    payerEmail: input.payerEmail ? maskEmail(input.payerEmail) : undefined,
  };
}

async function readMercadoPagoResponseBody(response: Response) {
  const text = await response.text().catch(() => "");

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

function mercadoPagoBodyDetails(
  status: number,
  body: unknown,
): SafeMercadoPagoErrorPayload {
  const objectBody =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  return {
    status,
    message: safeText(objectBody.message),
    error: safeText(objectBody.error),
    cause: redactMercadoPagoValue(objectBody.cause),
    responseBody: redactMercadoPagoValue(body),
  };
}

export async function createMercadoPagoCheckoutPreference(
  input: MercadoPagoCheckoutInput,
): Promise<MercadoPagoCheckoutResponse> {
  const accessToken = requireEnv("MERCADO_PAGO_ACCESS_TOKEN");
  const payload = buildMercadoPagoPreferencePayload(input);

  try {
    logger.info("mercado_pago.preference.payload_ready", {
      ...mercadoPagoLogContext(input),
      transactionAmount: payload.items[0]?.unit_price,
      currencyId: payload.items[0]?.currency_id,
      successUrlOrigin: new URL(payload.back_urls.success).origin,
      failureUrlOrigin: new URL(payload.back_urls.failure).origin,
      notificationUrlOrigin: new URL(payload.notification_url).origin,
      hasPayerEmail: Boolean(payload.payer?.email),
      hasPreapprovalPlanId: false,
    });

    const response = await fetch(MERCADO_PAGO_PREFERENCE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Idempotency-Key": randomUUID(),
      },
      body: JSON.stringify(payload),
    });

    const body = await readMercadoPagoResponseBody(response);

    if (!response.ok) {
      const details = mercadoPagoBodyDetails(response.status, body);

      logger.error("mercado_pago.preference.failed", {
        ...mercadoPagoLogContext(input),
        status: response.status,
        mercadoPagoMessage: details.message,
        mercadoPagoError: details.error,
        mercadoPagoCause: details.cause,
        responseBody: details.responseBody,
      });

      throw new AppError(
        "MERCADO_PAGO_PREFERENCE_FAILED",
        "Mercado Pago recusou a criacao do checkout.",
        502,
        details,
      );
    }

    const result =
      body && typeof body === "object" ? (body as PreferenceCreateResult) : {};
    const checkoutUrl = assertCheckoutUrl(
      getPreferenceCheckoutUrl(result, {
        preferSandbox: isSandboxAccessToken(accessToken),
      }),
      "Mercado Pago nao retornou URL de checkout.",
    );

    logger.info("mercado_pago.preference.created", {
      ...mercadoPagoLogContext(input),
      status: response.status,
      providerPreferenceId: result.id,
    });

    return {
      provider: "MERCADO_PAGO",
      checkoutUrl,
      redirectUrl: checkoutUrl,
      providerPreferenceId: result.id,
      providerHttpStatus: response.status,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    const details = mercadoPagoErrorPayload(error);

    logger.error("mercado_pago.preference.failed", {
      ...mercadoPagoLogContext(input),
      status: details.status,
      mercadoPagoMessage: details.message,
      mercadoPagoError: details.error,
      mercadoPagoCause: details.cause,
      responseBody: details.responseBody,
    });

    throw new AppError(
      "MERCADO_PAGO_PREFERENCE_FAILED",
      "Mercado Pago recusou a criacao do checkout.",
      502,
      details,
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

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function mapPaymentStatus(status: string | undefined) {
  if (status === "approved" || status === "authorized") {
    return "ACTIVE" as const;
  }

  if (status === "refunded" || status === "charged_back") {
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

function providerResourceEventId(resourceType: string, value: unknown, fallback: string) {
  return `${resourceType}:${normalizeDataId(stringValue(value) ?? fallback)}`;
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
      providerEventId: providerResourceEventId(
        "preapproval",
        preApproval.id,
        dataId,
      ),
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
    const subscriptionStatus = mapPaymentStatus(payment.status);

    return {
      provider: "MERCADO_PAGO",
      providerEventId: providerResourceEventId("payment", payment.id, dataId),
      eventType: topic || "payment",
      plan: parsePaidPlan(stringValue(metadata.plan) ?? reference.plan),
      tenantId: stringValue(metadata.tenantId) ?? reference.tenant,
      tenantSlug: stringValue(metadata.tenantSlug) ?? reference.slug,
      providerCustomerId: payment.payer?.id,
      providerSubscriptionId: metadataSubscriptionId(metadata),
      subscriptionStatus,
      currentPeriodEnd:
        subscriptionStatus === "ACTIVE" ? addDays(periodBase, 30) : undefined,
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
