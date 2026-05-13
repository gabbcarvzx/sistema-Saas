import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { AppError } from "@/lib/http-errors";
import { getTenantAccessBySlug } from "@/lib/billing/access";
import { resolveTenantSlug } from "@/lib/tenant-resolver";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async (request) => {
  const expectedSecret = process.env.INTERNAL_ACCESS_SECRET;

  if (
    expectedSecret &&
    request.headers.get("x-internal-access-secret") !== expectedSecret
  ) {
    throw new AppError("UNAUTHORIZED", "Acesso interno nao autorizado.", 401);
  }

  const tenantSlug = resolveTenantSlug(request.headers, request.url);
  const access = await getTenantAccessBySlug(tenantSlug);

  if (!access) {
    throw new AppError("TENANT_NOT_FOUND", "Cliente nao encontrado.", 404, {
      tenantSlug,
    });
  }

  return NextResponse.json(access, {
    headers: {
      "cache-control": "no-store",
    },
  });
});
