import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { blockExpiredTenantSubscriptions } from "@/lib/billing/renewals";
import { ConfigurationError, UnauthorizedError } from "@/lib/http-errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function assertCronAuthorization(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    throw new ConfigurationError("Configure CRON_SECRET para proteger o cron.");
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    throw new UnauthorizedError("Cron nao autorizado.");
  }
}

export const GET = withApiHandler(async (request) => {
  assertCronAuthorization(request);

  const result = await blockExpiredTenantSubscriptions();

  return NextResponse.json(
    {
      ok: true,
      updated: result.blockedCount,
      checkedAt: result.checkedAt.toISOString(),
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
});
