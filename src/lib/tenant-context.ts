import { headers } from "next/headers";
import { getTenantAccessBySlug, assertTenantAccess } from "@/lib/billing/access";
import { NotFoundError } from "@/lib/http-errors";
import { resolveTenantSlug } from "@/lib/tenant-resolver";

export type TenantContext = {
  id: string;
  slug: string;
  name: string;
};

async function getTenantAccessContext(slug: string) {
  const access = await getTenantAccessBySlug(slug);

  if (!access) {
    throw new NotFoundError("Cliente nao encontrado.", { tenantSlug: slug });
  }

  return access;
}

async function getTenantContextBySlug(slug: string): Promise<TenantContext> {
  const access = await getTenantAccessContext(slug);

  assertTenantAccess(access);

  return {
    id: access.tenantId,
    slug: access.tenantSlug,
    name: access.tenantName,
  };
}

async function getTenantIdentityBySlug(slug: string): Promise<TenantContext> {
  const access = await getTenantAccessContext(slug);

  return {
    id: access.tenantId,
    slug: access.tenantSlug,
    name: access.tenantName,
  };
}

export async function getTenantContext() {
  const requestHeaders = headers();
  const slug = resolveTenantSlug(requestHeaders);
  return getTenantContextBySlug(slug);
}

export async function getTenantContextFromRequest(request: Request) {
  const slug = resolveTenantSlug(request.headers, request.url);
  return getTenantContextBySlug(slug);
}

export async function getTenantIdentityFromRequest(request: Request) {
  const slug = resolveTenantSlug(request.headers, request.url);
  return getTenantIdentityBySlug(slug);
}
