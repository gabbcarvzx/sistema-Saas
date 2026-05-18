import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withApiHandler(async (request) => {
  const loginUrl = new URL("/login", request.url);
  const response = NextResponse.redirect(loginUrl, { status: 303 });
  const cookieOptions = {
    httpOnly: true,
    maxAge: 0,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };

  response.cookies.set("session", "", cookieOptions);
  response.cookies.set("tenantSlug", "", cookieOptions);

  return response;
});
