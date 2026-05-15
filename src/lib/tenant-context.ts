import { cookies, headers } from "next/headers";
import { verifyAuthToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";
import { getTenantAccessBySlug, assertTenantAccess } from "@/lib/billing/access";
import { NotFoundError, UnauthorizedError } from "@/lib/http-errors";
import { evaluateTenantAccess } from "@/lib/billing/policy";
import { resolveTenantSlugFromTrustedHeaders } from "@/lib/tenant-resolver";

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

function normalizeTenantSlug(value: string | null | undefined) {
  const slug = value?.trim().toLowerCase();

  if (!slug) {
    return null;
  }

  return slug.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
}

function getExplicitTenantSlug(request: Request) {
  try {
    return normalizeTenantSlug(new URL(request.url).searchParams.get("tenant"));
  } catch {
    return null;
  }
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

async function getTenantIdentityBySession(request: Request) {
  const sessionToken = getCookieValue(request.headers.get("cookie"), "session");

  if (!sessionToken) {
    throw new UnauthorizedError("Sessao ausente ou expirada.");
  }

  const session = verifyAuthToken(sessionToken);
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    include: { subscription: true },
  });

  if (!tenant) {
    throw new NotFoundError("Cliente nao encontrado.", {
      tenantId: session.tenantId,
    });
  }

  const explicitTenantSlug = getExplicitTenantSlug(request);

  if (explicitTenantSlug && explicitTenantSlug !== tenant.slug) {
    throw new UnauthorizedError("Sessao nao pertence a este cliente.");
  }

  const access = evaluateTenantAccess({
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    status: tenant.status,
    subscription: tenant.subscription
      ? {
          id: tenant.subscription.id,
          status: tenant.subscription.status,
          trialEndsAt: tenant.subscription.trialEndsAt,
          currentPeriodEnd: tenant.subscription.currentPeriodEnd,
          blockedAt: tenant.subscription.blockedAt,
        }
      : null,
  });

  return {
    access,
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
    },
  };
}

export async function getTenantContext() {
  const requestHeaders = headers();
  const slug = resolveTenantSlugFromTrustedHeaders(requestHeaders);
  const sessionToken = cookies().get("session")?.value;

  return getTenantContextBySlug(slug, sessionToken);
}

export async function getTenantContextFromRequest(request: Request) {
  const context = await getTenantIdentityBySession(request);

  assertTenantAccess(context.access);

  return context.tenant;
}

export async function getTenantIdentityFromRequest(request: Request) {
  const context = await getTenantIdentityBySession(request);

  return context.tenant;
}
