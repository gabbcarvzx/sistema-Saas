import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { parseMercadoPagoWebhook } from "@/lib/billing/mercadopago";
import { processBillingWebhook } from "@/lib/billing/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withApiHandler(async (request) => {
  const rawBody = await request.text();
  const event = await parseMercadoPagoWebhook(rawBody, request);
  const result = await processBillingWebhook(event);

  return NextResponse.json(
    {
      received: true,
      processed: result.subscriptionUpdated,
      ...result,
    },
    { status: 200 },
  );
});
