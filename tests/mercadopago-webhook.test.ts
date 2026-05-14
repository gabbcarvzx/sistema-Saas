import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyMercadoPagoWebhookSignature } from "../src/lib/billing/mercadopago";

const secret = "mercado-pago-webhook-secret";
const ts = "1742505638683";
const requestId = "request-123";
const rawBody = JSON.stringify({
  type: "payment",
  data: { id: "123456" },
});

function signature(hashSecret = secret) {
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

    expect(() =>
      verifyMercadoPagoWebhookSignature(rawBody, request(signature())),
    ).not.toThrow();
  });

  it("rejects an invalid Mercado Pago HMAC signature", () => {
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = secret;

    expect(() =>
      verifyMercadoPagoWebhookSignature(rawBody, request(signature("wrong"))),
    ).toThrow("Assinatura Mercado Pago invalida.");
  });
});
