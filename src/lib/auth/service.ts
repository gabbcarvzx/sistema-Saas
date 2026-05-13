import { prisma } from "@/lib/prisma";
import { UnauthorizedError } from "@/lib/http-errors";
import { signAuthToken } from "@/lib/auth/jwt";
import { verifyPassword } from "@/lib/auth/password";
import type { LoginInput } from "@/lib/auth/schema";

export async function login(input: LoginInput) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: input.tenantSlug },
    select: { id: true, slug: true },
  });

  if (!tenant) {
    throw new UnauthorizedError("Credenciais invalidas.");
  }

  const user = await prisma.user.findUnique({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: input.email,
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
      role: true,
      tenantId: true,
    },
  });

  if (!user || !(await verifyPassword(input.password, user.password))) {
    throw new UnauthorizedError("Credenciais invalidas.");
  }

  const token = signAuthToken({
    sub: user.id,
    tenantId: user.tenantId,
    role: user.role,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    tenant,
  };
}
