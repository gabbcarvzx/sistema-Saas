import { NextRequest, NextResponse } from "next/server";
import { verifyAuthTokenEdge } from "@/lib/auth/edge-jwt";
import { DEFAULT_TENANT_SLUG, resolveTenantSlug } from "@/lib/tenant-resolver";

type TenantAccessResponse = {
  allowed: boolean;
  reason: string;
  tenantId: string;
  tenantSlug: string;
  subscriptionStatus: string;
};

const APP_PATH_PREFIX = "/app";

function getInternalAccessSecret() {
  const secret = process.env.INTERNAL_ACCESS_SECRET;

  return secret && secret.trim().length > 0 ? secret : null;
}

function isProtectedAppPath(pathname: string) {
  return (
    pathname === APP_PATH_PREFIX || pathname.startsWith(`${APP_PATH_PREFIX}/`)
  );
}

function isAccountRecoveryPath(pathname: string) {
  return pathname === "/app/account" || pathname.startsWith("/app/account/");
}

function isBillingRecoveryPath(pathname: string) {
  return (
    pathname === "/app/billing" ||
    pathname.startsWith("/app/billing/") ||
    isAccountRecoveryPath(pathname)
  );
}

function normalizeSlug(value: string | null | undefined) {
  const slug = value?.trim().toLowerCase();

  if (!slug) {
    return null;
  }

  return slug.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
}

function resolveTenantForMiddleware(request: NextRequest) {
  const tenantFromQuery = normalizeSlug(request.nextUrl.searchParams.get("tenant"));
  const tenantFromCookie = normalizeSlug(request.cookies.get("tenantSlug")?.value);

  if (tenantFromQuery) {
    return tenantFromQuery;
  }

  if (tenantFromCookie) {
    return tenantFromCookie;
  }

  const resolved = resolveTenantSlug(request.headers, request.nextUrl);

  if (resolved === "sistema-saas-kappa") {
    return DEFAULT_TENANT_SLUG;
  }

  return resolved;
}

function planBlockedResponse(request: NextRequest, access: TenantAccessResponse) {
  const blockedUrl = request.nextUrl.clone();
  blockedUrl.pathname = "/billing/blocked";
  blockedUrl.search = "";
  blockedUrl.searchParams.set("tenant", access.tenantSlug);
  blockedUrl.searchParams.set("reason", access.reason);

  return NextResponse.redirect(blockedUrl);
}

function unauthorizedResponse(request: NextRequest, tenantSlug: string) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("tenant", tenantSlug);

  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedAppPath(pathname)) {
    return NextResponse.next();
  }

  const tenantSlug = resolveTenantForMiddleware(request);
  const internalAccessSecret = getInternalAccessSecret();

  if (!internalAccessSecret) {
    return unauthorizedResponse(request, tenantSlug);
  }

  const checkUrl = request.nextUrl.clone();
  checkUrl.pathname = "/api/internal/tenant-access";
  checkUrl.search = "";
  checkUrl.searchParams.set("tenant", tenantSlug);

  const checkResponse = await fetch(checkUrl, {
    cache: "no-store",
    headers: {
      "x-internal-access-secret": internalAccessSecret,
      "x-tenant-slug": tenantSlug,
    },
  });

  if (!checkResponse.ok) {
    const blockedUrl = request.nextUrl.clone();
    blockedUrl.pathname = "/billing/blocked";
    blockedUrl.search = "";
    blockedUrl.searchParams.set("tenant", tenantSlug);
    blockedUrl.searchParams.set("reason", "TENANT_ACCESS_UNAVAILABLE");

    return NextResponse.redirect(blockedUrl);
  }

  const access = (await checkResponse.json()) as TenantAccessResponse;

  if (!access.allowed && !isBillingRecoveryPath(pathname)) {
    return planBlockedResponse(request, access);
  }

  const token = request.cookies.get("session")?.value;

  if (!token) {
    return unauthorizedResponse(request, access.tenantSlug);
  }

  let session;

  try {
    session = await verifyAuthTokenEdge(token);
  } catch {
    return unauthorizedResponse(request, access.tenantSlug);
  }

  if (session.tenantId !== access.tenantId) {
    return unauthorizedResponse(request, access.tenantSlug);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-id", access.tenantId);
  requestHeaders.set("x-tenant-slug", access.tenantSlug);
  requestHeaders.set("x-subscription-status", access.subscriptionStatus);
  requestHeaders.set("x-user-id", session.sub);
  requestHeaders.set("x-user-role", session.role);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.cookies.set("tenantSlug", access.tenantSlug, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return response;
}

export const config = {
  matcher: ["/app/:path*"],
};
