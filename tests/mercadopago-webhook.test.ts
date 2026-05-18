import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyMercadoPagoWebhookSignature } from "../src/lib/billing/mercadopago";

const secret = "mercado-pago-webhook-secret";
const requestId = "request-123";
const rawBody = JSON.stringify({
  type: "payment",
  data: { id: "123456" },
});

function signature(hashSecret = secret, ts = String(Date.now())) {
  const manifest = `id:123456;request-id:${requestId};ts:${ts};`;
  const hash = createHmac("sha256", hashSecret).update(manifest).digest("hex");
  return `ts=${ts},v1=${hash}`;
}

function request(xSignature: string) {
  return new Request("https://app.example.com/api/webhooks/mercadopago", {
    method: "POST",
    headers: {
      "x-request-id": requestId,
      "x-signature": xSignature,
    },
    body: rawBody,
  });
}

describe("verifyMercadoPagoWebhookSignature", () => {
  it("accepts a valid Mercado Pago HMAC signature", () => {
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = secret;
    process.env.MERCADO_PAGO_WEBHOOK_TOLERANCE_MS = "600000";
    const xSignature = signature();

    expect(() =>
      verifyMercadoPagoWebhookSignature(rawBody, request(xSignature)),
    ).not.toThrow();
  });

  it("rejects an invalid Mercado Pago HMAC signature", () => {
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = secret;
    process.env.MERCADO_PAGO_WEBHOOK_TOLERANCE_MS = "600000";
    const xSignature = signature("wrong");

    expect(() =>
      verifyMercadoPagoWebhookSignature(rawBody, request(xSignature)),
    ).toThrow("Assinatura Mercado Pago invalida.");
  });

  it("rejects a valid but expired Mercado Pago HMAC signature", () => {
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = secret;
    process.env.MERCADO_PAGO_WEBHOOK_TOLERANCE_MS = "1000";
    const expired = signature(secret, String(Date.now() - 5000));

    expect(() =>
      verifyMercadoPagoWebhookSignature(rawBody, request(expired)),
    ).toThrow("Assinatura Mercado Pago expirada.");
  });
});
