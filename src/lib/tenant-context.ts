import { cookies, headers } from "next/headers";
import { verifyAuthToken } from "@/lib/auth/jwt";
import { getTenantAccessBySlug, assertTenantAccess } from "@/lib/billing/access";
import { NotFoundError, UnauthorizedError } from "@/lib/http-errors";
import {
  resolveTenantSlug,
  resolveTenantSlugFromTrustedHeaders,
} from "@/lib/tenant-resolver";

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

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return undefined;
  }

  const cookiesList = cookieHeader.split(";").map((cookie) => cookie.trim());
  const match = cookiesList.find((cookie) => cookie.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

function assertSessionTenant(token: string | undefined, tenantId: string) {
  if (!token) {
    throw new UnauthorizedError("Sessao ausente ou expirada.");
  }

  const session = verifyAuthToken(token);

  if (session.tenantId !== tenantId) {
    throw new UnauthorizedError("Sessao nao pertence a este cliente.");
  }

  return session;
}

async function getTenantContextBySlug(
  slug: string,
  sessionToken: string | undefined,
): Promise<TenantContext> {
  const access = await getTenantAccessContext(slug);

  assertTenantAccess(access);
  assertSessionTenant(sessionToken, access.tenantId);

  return {
    id: access.tenantId,
    slug: access.tenantSlug,
    name: access.tenantName,
  };
}

async function getTenantIdentityBySlug(
  slug: string,
  sessionToken: string | undefined,
): Promise<TenantContext> {
  const access = await getTenantAccessContext(slug);

  assertSessionTenant(sessionToken, access.tenantId);

  return {
    id: access.tenantId,
    slug: access.tenantSlug,
    name: access.tenantName,
  };
}

export async function getTenantContext() {
  const requestHeaders = headers();
  const slug = resolveTenantSlugFromTrustedHeaders(requestHeaders);
  const sessionToken = cookies().get("session")?.value;

  return getTenantContextBySlug(slug, sessionToken);
}

export async function getTenantContextFromRequest(request: Request) {
  const slug = resolveTenantSlug(request.headers, request.url);
  const sessionToken = getCookieValue(request.headers.get("cookie"), "session");

  return getTenantContextBySlug(slug, sessionToken);
}

export async function getTenantIdentityFromRequest(request: Request) {
  const slug = resolveTenantSlug(request.headers, request.url);
  const sessionToken = getCookieValue(request.headers.get("cookie"), "session");

  return getTenantIdentityBySlug(slug, sessionToken);
}
