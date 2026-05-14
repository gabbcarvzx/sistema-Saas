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
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { code: input.plan },
    select: {
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
    throw new AppError("PLAN_NOT_FOUND", "Plano nao encontrado.", 404);
  }

  if (input.provider === "STRIPE" && !plan.stripePriceId) {
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

  return createCheckoutSession({
    ...input,
    planName: plan.name,
    priceCents: plan.priceCents,
    currency: plan.currency,
    stripePriceId: plan.stripePriceId ?? undefined,
    mercadoPagoPlanId: optionalProviderId(plan.mercadoPagoPlanId),
    payerEmail: input.payerEmail ?? adminUser?.email,
  });
}

export async function processBillingWebhook(event: ParsedWebhookEvent) {
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

    return { tenantId: null, subscriptionUpdated: false };
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
    return { tenantId: tenant.id, subscriptionUpdated: false };
  }

  if (event.subscriptionStatus === "BLOCKED") {
    logger.warn("billing.payment.failed", {
      tenantId: tenant.id,
      provider: event.provider,
      providerEventId: event.providerEventId,
      eventType: event.eventType,
    });
  }

  if (
    event.subscriptionStatus === "BLOCKED" ||
    event.subscriptionStatus === "CANCELED"
  ) {
    logger.warn("billing.subscription.blocked", {
      tenantId: tenant.id,
      provider: event.provider,
      providerEventId: event.providerEventId,
      status: event.subscriptionStatus,
    });
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

    return { tenantId: tenant.id, subscriptionUpdated: false };
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

  return { tenantId: tenant.id, subscriptionUpdated: true };
}
