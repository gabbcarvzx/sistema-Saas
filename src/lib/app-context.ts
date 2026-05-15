import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/auth/jwt";
import { NotFoundError, UnauthorizedError } from "@/lib/http-errors";
import { resolveTenantSlugFromTrustedHeaders } from "@/lib/tenant-resolver";

export async function getAppContext() {
  const requestHeaders = headers();
  const tenantSlug = resolveTenantSlugFromTrustedHeaders(requestHeaders);
  const sessionToken = cookies().get("session")?.value;

  if (!sessionToken) {
    throw new UnauthorizedError("Sessao ausente ou expirada.");
  }

  const session = verifyAuthToken(sessionToken);

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      supportEmail: true,
      subscription: {
        select: {
          id: true,
          status: true,
          trialStartsAt: true,
          trialEndsAt: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          blockedAt: true,
          cancelAtPeriodEnd: true,
          plan: {
            select: {
              code: true,
              slug: true,
              name: true,
              priceCents: true,
              currency: true,
              productLimit: true,
              storeLimit: true,
            },
          },
        },
      },
    },
  });

  if (!tenant) {
    throw new NotFoundError("Cliente nao encontrado.", { tenantSlug });
  }

  if (tenant.id !== session.tenantId) {
    throw new UnauthorizedError("Sessao nao pertence a este cliente.");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      tenantId: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!user || user.tenantId !== tenant.id) {
    throw new UnauthorizedError("Usuario nao pertence a este cliente.");
  }

  return {
    tenant,
    user,
  };
}
