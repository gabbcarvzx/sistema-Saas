import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { signupSchema } from "@/lib/signup/schema";
import { signupTenant } from "@/lib/signup/service";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withApiHandler(async (request) => {
  const parsed = signupSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const result = await signupTenant(parsed.data);

  logger.info("signup.completed", {
    tenantId: result.tenantId,
    tenantSlug: result.tenantSlug,
    adminUserId: result.adminUserId,
    subscriptionId: result.subscriptionId,
    subscriptionStatus: result.subscriptionStatus,
    trialStartsAt: result.trialStartsAt,
    trialEndsAt: result.trialEndsAt,
  });

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("tenant", result.tenantSlug);

  return NextResponse.redirect(loginUrl, {
    status: 303,
    headers: {
      "x-tenant-slug": result.tenantSlug,
    },
  });
});
