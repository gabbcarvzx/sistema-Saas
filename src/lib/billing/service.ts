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
  successUrl: string;
  cancelUrl: string;
};

export async function createTenantCheckoutSession(
  input: CreateTenantCheckoutInput,
): Promise<CheckoutResponse> {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { code: input.plan },
    select: {
      code: true,
      stripePriceId: true,
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

  return createCheckoutSession({
    ...input,
    priceId: plan.stripePriceId ?? "",
  });
}

export async function processBillingWebhook(event: ParsedWebhookEvent) {
  const tenant = event.tenantId
    ? await prisma.tenant.findUnique({
        where: { id: event.tenantId },
        select: { id: true },
      })
    : event.tenantSlug
      ? await prisma.tenant.findUnique({
          where: { slug: event.tenantSlug },
          select: { id: true },
        })
      : null;

  await prisma.paymentEvent.upsert({
    where: {
      provider_providerEventId: {
        provider: event.provider,
        providerEventId: event.providerEventId,
      },
    },
    create: {
      tenantId: tenant?.id,
      provider: event.provider,
      providerEventId: event.providerEventId,
      eventType: event.eventType,
      payload: event.payload as Prisma.InputJsonValue,
    },
    update: {
      tenantId: tenant?.id,
      eventType: event.eventType,
      payload: event.payload as Prisma.InputJsonValue,
      processedAt: new Date(),
    },
  });

  if (!tenant || !event.subscriptionStatus) {
    return { tenantId: tenant?.id ?? null, subscriptionUpdated: false };
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

  await prisma.tenantSubscription.update({
    where: { tenantId: tenant.id },
      data: {
        status: event.subscriptionStatus,
        provider: event.provider,
        providerCustomerId: event.providerCustomerId,
        providerSubscriptionId: event.providerSubscriptionId,
        currentPeriodEnd: event.currentPeriodEnd,
      blockedAt:
        event.subscriptionStatus === "BLOCKED" ||
        event.subscriptionStatus === "CANCELED"
          ? new Date()
          : null,
    },
  });

  return { tenantId: tenant.id, subscriptionUpdated: true };
}
