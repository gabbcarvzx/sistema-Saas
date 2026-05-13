import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { z } from "zod";
import { ConfigurationError, UnauthorizedError } from "@/lib/http-errors";

const jwtPayloadSchema = z.object({
  sub: z.string().uuid(),
  tenantId: z.string().uuid(),
  role: z.enum(["ADMIN", "MEMBER"]),
});

export type AuthSession = z.infer<typeof jwtPayloadSchema>;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new ConfigurationError(
      "Configure JWT_SECRET com pelo menos 32 caracteres.",
    );
  }

  return secret;
}

export function signAuthToken(session: AuthSession) {
  const options: SignOptions = {
    algorithm: "HS256",
    expiresIn: (process.env.JWT_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"],
    issuer: process.env.JWT_ISSUER ?? "stockpro",
    audience: process.env.JWT_AUDIENCE ?? "stockpro-app",
  };

  return jwt.sign(session, getJwtSecret(), {
    ...options,
  });
}

export function verifyAuthToken(token: string): AuthSession {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
      issuer: process.env.JWT_ISSUER ?? "stockpro",
      audience: process.env.JWT_AUDIENCE ?? "stockpro-app",
    });

    return jwtPayloadSchema.parse(decoded);
  } catch {
    throw new UnauthorizedError("Sessao invalida ou expirada.");
  }
}
