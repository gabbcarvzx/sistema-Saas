import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { AppError } from "@/lib/http-errors";
import {
  parseProviderWebhook,
  paymentProviderSchema,
} from "@/lib/billing/providers";
import { processBillingWebhook } from "@/lib/billing/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: {
    provider: string;
  };
};

export const POST = withApiHandler<RouteContext>(async (request, { params }) => {
  const provider = paymentProviderSchema.safeParse(params.provider.toUpperCase());

  if (!provider.success) {
    throw new AppError("BILLING_PROVIDER_INVALID", "Provedor invalido.", 400);
  }

  const rawBody = await request.text();
  const event = parseProviderWebhook(provider.data, rawBody, request);
  const result = await processBillingWebhook(event);

  return NextResponse.json({ received: true, ...result });
});
