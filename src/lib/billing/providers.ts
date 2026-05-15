import Stripe from "stripe";
import { z } from "zod";
import {
  AppError,
  ConfigurationError,
  UnauthorizedError,
} from "@/lib/http-errors";
import {
  createMercadoPagoRecurringSubscription,
  parseMercadoPagoWebhook,
} from "@/lib/billing/mercadopago";

export const paymentProviderSchema = z.enum(["STRIPE", "MERCADO_PAGO"]);
export const paidPlanSchema = z.enum(["STARTER", "PROFESSIONAL", "ENTERPRISE"]);

export type PaymentProviderCode = z.infer<typeof paymentProviderSchema>;
export type PaidPlanCode = z.infer<typeof paidPlanSchema>;

export type CheckoutRequest = {
  tenantId: string;
  tenantSlug: string;
  plan: PaidPlanCode;
  provider: PaymentProviderCode;
  stripePriceId?: string;
  mercadoPagoPlanId?: string | null;
  planName: string;
  priceCents: number;
  currency: string;
  payerEmail?: string;
  successUrl: string;
  cancelUrl: string;
};

export type CheckoutResponse = {
  provider: PaymentProviderCode;
  checkoutUrl: string;
  redirectUrl?: string;
  providerPreferenceId?: string;
  providerSubscriptionId?: string;
  providerHttpStatus?: number;
};

export type ParsedWebhookEvent = {
  provider: PaymentProviderCode;
  providerEventId: string;
  eventType: string;
  plan?: PaidPlanCode;
  tenantId?: string;
  tenantSlug?: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  subscriptionStatus?: "TRIAL" | "ACTIVE" | "BLOCKED" | "CANCELED";
  currentPeriodEnd?: Date;
  payload: unknown;
};

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new ConfigurationError(`Configure ${name} para habilitar billing.`);
  }

  return value;
}

function getStripe() {
  return new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
    apiVersion: "2026-04-22.dahlia",
  });
}

export async function createCheckoutSession(
  request: CheckoutRequest,
): Promise<CheckoutResponse> {
  if (request.provider === "MERCADO_PAGO") {
    return createMercadoPagoRecurringSubscription({
      tenantId: request.tenantId,
      tenantSlug: request.tenantSlug,
      plan: request.plan,
      planName: request.planName,
      amountCents: request.priceCents,
      currency: request.currency,
      mercadoPagoPlanId: request.mercadoPagoPlanId,
      payerEmail: request.payerEmail,
      successUrl: request.successUrl,
      cancelUrl: request.cancelUrl,
    });
  }

  if (!request.stripePriceId) {
    throw new AppError(
      "BILLING_PRICE_NOT_CONFIGURED",
      "Configure o priceId da Stripe para este plano.",
      500,
      { plan: request.plan },
    );
  }

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: request.stripePriceId, quantity: 1 }],
    success_url: request.successUrl,
    cancel_url: request.cancelUrl,
    client_reference_id: request.tenantId,
    metadata: {
      tenantId: request.tenantId,
      tenantSlug: request.tenantSlug,
      plan: request.plan,
    },
    subscription_data: {
      metadata: {
        tenantId: request.tenantId,
        tenantSlug: request.tenantSlug,
        plan: request.plan,
      },
    },
  });

  if (!session.url) {
    throw new AppError(
      "BILLING_CHECKOUT_FAILED",
      "Stripe nao retornou URL de checkout.",
      502,
    );
  }

  return {
    provider: "STRIPE",
    checkoutUrl: session.url,
  };
}

function mapStripeStatus(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  if (value === "active") {
    return "ACTIVE" as const;
  }

  if (value === "trialing") {
    return "TRIAL" as const;
  }

  if (value === "canceled") {
    return "CANCELED" as const;
  }

  if (["past_due", "unpaid", "incomplete", "incomplete_expired", "paused"].includes(value)) {
    return "BLOCKED" as const;
  }

  return undefined;
}

function dateFromUnix(value: number | null | undefined) {
  return value ? new Date(value * 1000) : undefined;
}

function stringifyStripePayload(event: Stripe.Event) {
  return JSON.parse(JSON.stringify(event)) as unknown;
}

function parseStripeEvent(rawBody: string, signature: string | null) {
  if (!signature) {
    throw new UnauthorizedError("Webhook Stripe sem assinatura.");
  }

  const event = getStripe().webhooks.constructEvent(
    rawBody,
    signature,
    requireEnv("STRIPE_WEBHOOK_SECRET"),
  );
  const object = event.data.object as Stripe.Subscription | Stripe.Checkout.Session;
  const metadata = object.metadata ?? {};
  const plan = paidPlanSchema.safeParse(metadata.plan);
  const customer =
    typeof object.customer === "string" ? object.customer : object.customer?.id;
  const subscriptionId =
    "subscription" in object && typeof object.subscription === "string"
      ? object.subscription
      : "id" in object && object.object === "subscription"
        ? object.id
        : undefined;
  const subscriptionStatus =
    object.object === "subscription"
      ? mapStripeStatus(object.status)
      : event.type === "invoice.payment_failed"
        ? "BLOCKED"
        : event.type === "checkout.session.completed"
          ? "ACTIVE"
          : undefined;

  const subscriptionPeriodEnd =
    object.object === "subscription"
      ? (object as Stripe.Subscription & { current_period_end?: number })
          .current_period_end
      : undefined;

  return {
    provider: "STRIPE" as const,
    providerEventId: event.id,
    eventType: event.type,
    plan: plan.success ? plan.data : undefined,
    tenantId: metadata.tenantId,
    tenantSlug: metadata.tenantSlug,
    providerCustomerId: customer,
    providerSubscriptionId: subscriptionId,
    subscriptionStatus,
    currentPeriodEnd:
      object.object === "subscription" ? dateFromUnix(subscriptionPeriodEnd) : undefined,
    payload: stringifyStripePayload(event),
  };
}

export async function parseProviderWebhook(
  provider: PaymentProviderCode,
  rawBody: string,
  request: Request,
): Promise<ParsedWebhookEvent> {
  if (provider === "STRIPE") {
    return parseStripeEvent(rawBody, request.headers.get("stripe-signature"));
  }

  return parseMercadoPagoWebhook(rawBody, request);
}
