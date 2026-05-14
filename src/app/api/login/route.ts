import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { getSessionMaxAgeSeconds } from "@/lib/auth/jwt";
import { loginSchema } from "@/lib/auth/schema";
import { login } from "@/lib/auth/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withApiHandler(async (request) => {
  const parsed = loginSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const session = await login(parsed.data);
  const maxAge = getSessionMaxAgeSeconds();
  const response = NextResponse.json({
    user: session.user,
    tenant: session.tenant,
    redirectTo: "/app/dashboard",
  });

  response.cookies.set("session", session.token, {
    httpOnly: true,
    maxAge,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  response.cookies.set("tenantSlug", session.tenant.slug, {
    httpOnly: true,
    maxAge,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return response;
});
