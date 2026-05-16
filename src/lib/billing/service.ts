import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createCheckoutSession,
  type CheckoutResponse,
  type PaidPlanCode,
  type PaymentProviderCode,
  type ParsedWebhookEvent,
} from "@/lib/billing/providers";
import { AppError } from "@/lib/http-errors";
import { logger } from "@/lib/logger";

type CreateTenantCheckoutInput = {
  tenantId: string;
  tenantSlug: string;
  plan: PaidPlanCode;
  provider: PaymentProviderCode;
  payerEmail?: string;
  successUrl: string;
  cancelUrl: string;
};

function optionalProviderId(value: string | null | undefined) {
  const trimmed = value?.trim();

  return trimmed && trimmed.length >= 8 ? trimmed : undefined;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getErrorName(error: unknown) {
  return error instanceof Error ? error.name : "UnknownError";
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function isAfter(left: Date | null | undefined, right: Date) {
  return Boolean(left && left.getTime() > right.getTime());
}

function isCheckoutProPayment(eventType: string) {
  return eventType.toLowerCase().includes("payment");
}

function resolveActivePeriodEnd(options: {
  eventType: string;
  eventPeriodEnd?: Date;
  existingPeriodEnd?: Date | null;
  processedAt: Date;
}) {
  if (!options.eventPeriodEnd) {
    const existingPeriodEnd = options.existingPeriodEnd;
    const base =
      existingPeriodEnd && isAfter(existingPeriodEnd, options.processedAt)
        ? existingPeriodEnd
        : options.processedAt;

    return addDays(base, 30);
  }

  if (!isCheckoutProPayment(options.eventType)) {
    return options.eventPeriodEnd;
  }

  const eventPeriodStart = addDays(options.eventPeriodEnd, -30);
  const existingPeriodEnd = options.existingPeriodEnd;
  const base =
    existingPeriodEnd && isAfter(existingPeriodEnd, eventPeriodStart)
      ? existingPeriodEnd
      : eventPeriodStart;

  return addDays(base, 30);
}

type SafeProviderLogValue =
  | string
  | number
  | boolean
  | null
  | SafeProviderLogValue[]
  | { [key: string]: SafeProviderLogValue | undefined };

type ProviderErrorLogDetails = {
  status?: number;
  message?: string;
  cause?: SafeProviderLogValue;
  error?: string;
};

function getProviderErrorDetails(error: unknown): ProviderErrorLogDetails | undefined {
  if (!(error instanceof AppError) || !error.details) {
    return undefined;
  }

  if (typeof error.details !== "object" || Array.isArray(error.details)) {
    return undefined;
  }

  const details = error.details as Record<string, unknown>;

  return {
    status:
      typeof details.status === "number" && Number.isFinite(details.status)
        ? details.status
        : undefined,
    message:
      typeof details.message === "string" ? details.message : undefined,
    cause: normalizeProviderCause(details.cause),
    error: typeof details.error === "string" ? details.error : undefined,
  };
}

function normalizeProviderCause(
  value: unknown,
  depth = 0,
): SafeProviderLogValue | undefined {
  if (depth > 3) {
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
      .map((item) => normalizeProviderCause(item, depth + 1))
      .filter((item): item is SafeProviderLogValue => item !== undefined);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !/token|secret|authorization|cookie|jwt/i.test(key))
        .map(([key, item]) => [
          key,
          normalizeProviderCause(item, depth + 1),
        ]),
    ) as { [key: string]: SafeProviderLogValue | undefined };
  }

  return String(value);
}

export async function createTenantCheckoutSession(
  input: CreateTenantCheckoutInput,
): Promise<CheckoutResponse> {
  logger.info("billing.checkout.start", {
    tenantId: input.tenantId,
    tenantSlug: input.tenantSlug,
    provider: input.provider,
    plan: input.plan,
  });

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { code: input.plan },
    select: {
      id: true,
      code: true,
      name: true,
      priceCents: true,
      currency: true,
      stripePriceId: true,
      mercadoPagoPlanId: true,
      isActive: true,
    },
  });

  if (!plan || !plan.isActive) {
    logger.error("billing.checkout.plan_not_found", {
      tenantId: input.tenantId,
      plan: input.plan,
    });

    throw new AppError("PLAN_NOT_FOUND", "Plano nao encontrado.", 404);
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
    select: {
      id: true,
      slug: true,
      subscription: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!tenant || tenant.slug !== input.tenantSlug) {
    logger.error("billing.checkout.tenant_not_found", {
      tenantId: input.tenantId,
      tenantSlug: input.tenantSlug,
    });

    throw new AppError(
      "TENANT_NOT_FOUND",
      "Tenant nao encontrado para esta sessao.",
      404,
    );
  }

  const initialStatus = tenant.subscription?.status ?? "TRIAL";

  if (input.provider === "STRIPE" && !plan.stripePriceId) {
    logger.error("billing.checkout.stripe_price_missing", {
      tenantId: tenant.id,
      plan: input.plan,
    });

    throw new AppError(
      "BILLING_PRICE_NOT_CONFIGURED",
      "Configure o priceId da Stripe para este plano.",
      500,
      { plan: input.plan },
    );
  }

  const adminUser = await prisma.user.findFirst({
    where: {
      tenantId: input.tenantId,
      role: "ADMIN",
    },
    select: {
      email: true,
    },
  });

  const payerEmail = input.payerEmail ?? adminUser?.email;

  if (input.provider === "MERCADO_PAGO" && !payerEmail) {
    logger.warn("billing.checkout.payer_email_missing", {
      tenantId: tenant.id,
    });
  }

  let checkout: CheckoutResponse;

  try {
    checkout = await createCheckoutSession({
      ...input,
      planName: plan.name,
      priceCents: plan.priceCents,
      currency: plan.currency,
      stripePriceId: plan.stripePriceId ?? undefined,
      mercadoPagoPlanId: optionalProviderId(plan.mercadoPagoPlanId),
      payerEmail,
    });

    logger.info("billing.checkout.created", {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      provider: checkout.provider,
      plan: input.plan,
      status: checkout.providerHttpStatus,
      providerSubscriptionId: checkout.providerSubscriptionId,
      providerPreferenceId: checkout.providerPreferenceId,
    });
  } catch (error) {
    const providerError = getProviderErrorDetails(error);

    logger.error("billing.checkout.failed", {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      provider: input.provider,
      plan: input.plan,
      status: providerError?.status,
      providerMessage: providerError?.message,
      providerCause: providerError?.cause,
      providerError: providerError?.error,
      errorName: getErrorName(error),
      errorMessage: getErrorMessage(error),
    });

    throw error;
  }

  try {
    await prisma.tenantSubscription.upsert({
      where: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id,
        planId: plan.id,
        status: initialStatus,
        provider: input.provider,
        providerSubscriptionId: checkout.providerSubscriptionId,
      },
      update: {
        planId: plan.id,
        provider: input.provider,
        providerSubscriptionId: checkout.providerSubscriptionId,
      },
    });

    logger.info("billing.subscription.persisted", {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      provider: input.provider,
      plan: input.plan,
      providerSubscriptionId: checkout.providerSubscriptionId,
    });
  } catch (error) {
    logger.error("billing.subscription.persist_failed", {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      provider: input.provider,
      plan: input.plan,
      errorName: getErrorName(error),
      errorMessage: getErrorMessage(error),
    });

    throw new AppError(
      "BILLING_SUBSCRIPTION_PERSIST_FAILED",
      "Falha ao salvar assinatura no banco de dados.",
      500,
    );
  }

  return {
    ...checkout,
    redirectUrl: checkout.redirectUrl ?? checkout.checkoutUrl,
  };
}

export async function processBillingWebhook(event: ParsedWebhookEvent) {
  logger.info("billing.webhook.received", {
    provider: event.provider,
    providerEventId: event.providerEventId,
    eventType: event.eventType,
    tenantId: event.tenantId,
    tenantSlug: event.tenantSlug,
    plan: event.plan,
    subscriptionStatus: event.subscriptionStatus,
    providerSubscriptionId: event.providerSubscriptionId,
  });

  const [tenantFromReference, plan] = await Promise.all([
    event.tenantId
      ? prisma.tenant.findUnique({
          where: { id: event.tenantId },
          select: { id: true, slug: true },
        })
      : event.tenantSlug
        ? prisma.tenant.findUnique({
            where: { slug: event.tenantSlug },
            select: { id: true, slug: true },
          })
        : null,

    event.plan
      ? prisma.subscriptionPlan.findUnique({
          where: { code: event.plan },
          select: { id: true },
        })
      : null,
  ]);

  let tenant = tenantFromReference;
  let subscriptionFromProvider: {
    tenantId: string;
    planId: string;
    currentPeriodEnd: Date | null;
    tenant: { id: string; slug: string };
  } | null = null;

  if (!tenant && event.providerSubscriptionId) {
    subscriptionFromProvider = await prisma.tenantSubscription.findFirst({
      where: {
        provider: event.provider,
        providerSubscriptionId: event.providerSubscriptionId,
      },
      select: {
        tenantId: true,
        planId: true,
        currentPeriodEnd: true,
        tenant: {
          select: {
            id: true,
            slug: true,
          },
        },
      },
    });
    tenant = subscriptionFromProvider?.tenant ?? null;
  }

  if (!tenant) {
    logger.warn("billing.webhook.tenant_unresolved", {
      provider: event.provider,
      providerEventId: event.providerEventId,
      eventType: event.eventType,
      tenantId: event.tenantId,
      tenantSlug: event.tenantSlug,
      providerSubscriptionId: event.providerSubscriptionId,
    });

    return {
      tenantId: null,
      subscriptionUpdated: false,
    };
  }

  const processedAt = new Date();

  await prisma.paymentEvent.upsert({
    where: {
      provider_providerEventId: {
        provider: event.provider,
        providerEventId: event.providerEventId,
      },
    },
    create: {
      tenantId: tenant.id,
      provider: event.provider,
      providerEventId: event.providerEventId,
      eventType: event.eventType,
      payload: event.payload as Prisma.InputJsonValue,
      processedAt,
    },
    update: {
      tenantId: tenant.id,
      eventType: event.eventType,
      payload: event.payload as Prisma.InputJsonValue,
      processedAt,
    },
  });

  if (!event.subscriptionStatus) {
    logger.info("billing.webhook.no_subscription_status", {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      providerEventId: event.providerEventId,
    });

    return {
      tenantId: tenant.id,
      subscriptionUpdated: false,
    };
  }

  const existingSubscription =
    subscriptionFromProvider ??
    (await prisma.tenantSubscription.findUnique({
      where: { tenantId: tenant.id },
      select: { tenantId: true, planId: true, currentPeriodEnd: true },
    }));

  const planId = plan?.id ?? existingSubscription?.planId;

  if (!planId) {
    logger.error("billing.subscription.plan_unresolved", {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      provider: event.provider,
      providerEventId: event.providerEventId,
      eventType: event.eventType,
      plan: event.plan,
    });

    return {
      tenantId: tenant.id,
      subscriptionUpdated: false,
    };
  }

  const isBlocked =
    event.subscriptionStatus === "BLOCKED" ||
    event.subscriptionStatus === "CANCELED";

  const isActive = event.subscriptionStatus === "ACTIVE";
  const currentPeriodEnd = isActive
    ? resolveActivePeriodEnd({
        eventType: event.eventType,
        eventPeriodEnd: event.currentPeriodEnd,
        existingPeriodEnd: existingSubscription?.currentPeriodEnd,
        processedAt,
      })
    : event.currentPeriodEnd;

  await prisma.tenantSubscription.upsert({
    where: { tenantId: tenant.id },
    create: {
      tenantId: tenant.id,
      planId,
      status: event.subscriptionStatus,
      provider: event.provider,
      providerCustomerId: event.providerCustomerId,
      providerSubscriptionId: event.providerSubscriptionId,
      currentPeriodStart: isActive ? processedAt : undefined,
      currentPeriodEnd,
      cancelAtPeriodEnd: event.subscriptionStatus === "CANCELED",
      blockedAt: isBlocked ? processedAt : null,
    },
    update: {
      ...(plan ? { planId: plan.id } : {}),
      status: event.subscriptionStatus,
      provider: event.provider,
      providerCustomerId: event.providerCustomerId,
      providerSubscriptionId: event.providerSubscriptionId,
      currentPeriodStart: isActive ? processedAt : undefined,
      currentPeriodEnd,
      cancelAtPeriodEnd: event.subscriptionStatus === "CANCELED",
      blockedAt: isBlocked ? processedAt : null,
    },
  });

  logger.info("billing.subscription.updated", {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    provider: event.provider,
    plan: event.plan,
    status: event.subscriptionStatus,
    providerSubscriptionId: event.providerSubscriptionId,
  });

  return {
    tenantId: tenant.id,
    subscriptionUpdated: true,
  };
}
