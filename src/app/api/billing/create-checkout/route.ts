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
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

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
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
  });

  return NextResponse.json(checkout, { status: 201 });
});
