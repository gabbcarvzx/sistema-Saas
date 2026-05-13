import { NextRequest, NextResponse } from "next/server";
import { verifyAuthTokenEdge } from "@/lib/auth/edge-jwt";
import { resolveTenantSlug } from "@/lib/tenant-resolver";

type TenantAccessResponse = {
  allowed: boolean;
  reason: string;
  tenantId: string;
  tenantSlug: string;
  subscriptionStatus: string;
};

const PUBLIC_PATHS = [
  "/billing/blocked",
  "/api/internal/tenant-access",
  "/api/billing/webhook",
  "/api/login",
  "/api/signup",
  "/login",
  "/signup",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (publicPath) =>
      pathname === publicPath || pathname.startsWith(`${publicPath}/`),
  );
}

function isApiRequest(pathname: string) {
  return pathname.startsWith("/api/");
}

function planBlockedResponse(request: NextRequest, access: TenantAccessResponse) {
  if (isApiRequest(request.nextUrl.pathname)) {
    return NextResponse.json(
      {
        code: "PLAN_EXPIRED",
        message: "Plano expirado ou bloqueado.",
        reason: access.reason,
      },
      { status: 402 },
    );
  }

  const blockedUrl = request.nextUrl.clone();
  blockedUrl.pathname = "/billing/blocked";
  blockedUrl.searchParams.set("tenant", access.tenantSlug);
  blockedUrl.searchParams.set("reason", access.reason);

  return NextResponse.redirect(blockedUrl);
}

function unauthorizedResponse(request: NextRequest, tenantSlug: string) {
  if (isApiRequest(request.nextUrl.pathname)) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Sessao invalida ou expirada." },
      { status: 401 },
    );
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("tenant", tenantSlug);

  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const tenantSlug = resolveTenantSlug(request.headers, request.nextUrl);
  const checkUrl = request.nextUrl.clone();
  checkUrl.pathname = "/api/internal/tenant-access";
  checkUrl.search = "";
  checkUrl.searchParams.set("tenant", tenantSlug);

  const checkResponse = await fetch(checkUrl, {
    cache: "no-store",
    headers: {
      "x-internal-access-secret": process.env.INTERNAL_ACCESS_SECRET ?? "",
      "x-tenant-slug": tenantSlug,
    },
  });

  if (!checkResponse.ok) {
    if (isApiRequest(pathname)) {
      return NextResponse.json(
        { code: "TENANT_ACCESS_UNAVAILABLE", message: "Tenant indisponivel." },
        { status: checkResponse.status },
      );
    }

    return NextResponse.rewrite(new URL("/billing/blocked", request.url));
  }

  const access = (await checkResponse.json()) as TenantAccessResponse;

  if (!access.allowed) {
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
