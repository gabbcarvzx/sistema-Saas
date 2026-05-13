export type EdgeAuthSession = {
  sub: string;
  tenantId: string;
  role: "ADMIN" | "MEMBER";
};

type JwtPayload = EdgeAuthSession & {
  exp?: number;
  iss?: string;
  aud?: string;
};

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function base64UrlToJson<T>(value: string): T {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value))) as T;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET invalido.");
  }

  return new TextEncoder().encode(secret);
}

async function verifySignature(signingInput: string, signature: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    getJwtSecret(),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  return crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlToBytes(signature),
    new TextEncoder().encode(signingInput),
  );
}

export async function verifyAuthTokenEdge(token: string): Promise<EdgeAuthSession> {
  const [encodedHeader, encodedPayload, signature] = token.split(".");

  if (!encodedHeader || !encodedPayload || !signature) {
    throw new Error("JWT invalido.");
  }

  const header = base64UrlToJson<{ alg?: string; typ?: string }>(encodedHeader);

  if (header.alg !== "HS256") {
    throw new Error("Algoritmo JWT invalido.");
  }

  const signingInput = `${encodedHeader}.${encodedPayload}`;

  if (!(await verifySignature(signingInput, signature))) {
    throw new Error("Assinatura JWT invalida.");
  }

  const payload = base64UrlToJson<JwtPayload>(encodedPayload);
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp && payload.exp <= now) {
    throw new Error("JWT expirado.");
  }

  if (payload.iss !== (process.env.JWT_ISSUER ?? "stockpro")) {
    throw new Error("Issuer JWT invalido.");
  }

  if (payload.aud !== (process.env.JWT_AUDIENCE ?? "stockpro-app")) {
    throw new Error("Audience JWT invalida.");
  }

  if (
    typeof payload.sub !== "string" ||
    typeof payload.tenantId !== "string" ||
    (payload.role !== "ADMIN" && payload.role !== "MEMBER")
  ) {
    throw new Error("Payload JWT invalido.");
  }

  return {
    sub: payload.sub,
    tenantId: payload.tenantId,
    role: payload.role,
  };
}
