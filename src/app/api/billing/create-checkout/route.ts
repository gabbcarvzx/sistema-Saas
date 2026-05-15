import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api-handler";
import { paidPlanSchema, paymentProviderSchema } from "@/lib/billing/providers";
import { createTenantCheckoutSession } from "@/lib/billing/service";
import { getTenantIdentityFromRequest } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const checkoutSchema = z.object({
  provider: paymentProviderSchema.default("MERCADO_PAGO"),
  plan: paidPlanSchema,
  payerEmail: z.string().email().optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

function billingReturnUrls(request: Request) {
  const origin = getPublicOrigin(request);

  return {
    successUrl: `${origin}/app/billing?checkout=success`,
    cancelUrl: `${origin}/app/billing?checkout=cancel`,
  };
}

function getPublicOrigin(request: Request) {
  return (
    parseOrigin(process.env.APP_URL) ??
    parseOrigin(process.env.NEXT_PUBLIC_APP_URL) ??
    parseOrigin(process.env.VERCEL_URL) ??
    new URL(request.url).origin
  );
}

function parseOrigin(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  try {
    return new URL(
      trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
    ).origin;
  } catch {
    return undefined;
  }
}

export const POST = withApiHandler(async (request) => {
  const tenant = await getTenantIdentityFromRequest(request);
  const parsed = checkoutSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const checkout = await createTenantCheckoutSession({
    ...parsed.data,
    ...billingReturnUrls(request),
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
  });

  return NextResponse.json(checkout, { status: 201 });
});
