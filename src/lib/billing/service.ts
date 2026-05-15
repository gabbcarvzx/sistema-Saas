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

    throw new AppError(
      "PLAN_NOT_FOUND",
      "Plano nao encontrado.",
      404,
    );
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
    logger.error("billing.checkout.payer_email_missing", {
      tenantId: tenant.id,
    });

    throw new AppError(
      "BILLING_PAYER_EMAIL_REQUIRED",
      "Nao foi possivel identificar o email do pagador.",
      400,
    );
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
      provider: checkout.provider,
      providerSubscriptionId: checkout.providerSubscriptionId,
      providerPreferenceId: checkout.providerPreferenceId,
      checkoutUrl: checkout.checkoutUrl,
    });
  } catch (error) {
    logger.error("billing.checkout.failed", {
      tenantId: tenant.id,
      provider: input.provider,
      plan: input.plan,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error,
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
      provider: input.provider,
      providerSubscriptionId: checkout.providerSubscriptionId,
    });
  } catch (error) {
    logger.error("billing.subscription.persist_failed", {
      tenantId: tenant.id,
      provider: input.provider,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error,
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
  });

  const [tenant, plan] = await Promise.all([
    event.tenantId
      ? prisma.tenant.findUnique({
          where: { id: event.tenantId },
          select: { id: true },
        })
      : event.tenantSlug
        ? prisma.tenant.findUnique({
            where: { slug: event.tenantSlug },
            select: { id: true },
          })
        : null,

    event.plan
      ? prisma.subscriptionPlan.findUnique({
          where: { code: event.plan },
          select: { id: true },
        })
      : null,
  ]);

  if (!tenant) {
    logger.warn("billing.webhook.tenant_unresolved", {
      provider: event.provider,
      providerEventId: event.providerEventId,
      eventType: event.eventType,
      tenantId: event.tenantId,
      tenantSlug: event.tenantSlug,
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
      providerEventId: event.providerEventId,
    });

    return {
      tenantId: tenant.id,
      subscriptionUpdated: false,
    };
  }

  const existingSubscription = await prisma.tenantSubscription.findUnique({
    where: { tenantId: tenant.id },
    select: { planId: true },
  });

  const planId = plan?.id ?? existingSubscription?.planId;

  if (!planId) {
    logger.error("billing.subscription.plan_unresolved", {
      tenantId: tenant.id,
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
      currentPeriodEnd: event.currentPeriodEnd,
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
      currentPeriodEnd: event.currentPeriodEnd,
      cancelAtPeriodEnd: event.subscriptionStatus === "CANCELED",
      blockedAt: isBlocked ? processedAt : null,
    },
  });

  logger.info("billing.subscription.updated", {
    tenantId: tenant.id,
    provider: event.provider,
    status: event.subscriptionStatus,
    providerSubscriptionId: event.providerSubscriptionId,
  });

  return {
    tenantId: tenant.id,
    subscriptionUpdated: true,
  };
}