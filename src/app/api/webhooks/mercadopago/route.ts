import { NextRequest, NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { parseMercadoPagoWebhook } from "@/lib/billing/mercadopago";
import { processBillingWebhook } from "@/lib/billing/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Webhook Mercado Pago
 * Recebe notificações de:
 * - payment
 * - preapproval (assinaturas)
 */
export const POST = withApiHandler(async (request: NextRequest) => {
  const rawBody = await request.text();

  try {
    // ✅ Validar assinatura e extrair evento
    const event = await parseMercadoPagoWebhook(rawBody, request);

    if (!event) {
      return NextResponse.json(
        { message: "Evento inválido" },
        { status: 400 }
      );
    }

    // ✅ Processar evento de billing
    const result = await processBillingWebhook(event);

    return NextResponse.json(
      {
        received: true,
        processed: true,
        ...result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Erro no webhook Mercado Pago:", error);

    // ⚠️ Mercado Pago exige 200 para não ficar reenviando infinitamente
    return NextResponse.json(
      {
        received: true,
        processed: false,
        error: "Erro interno ao processar webhook",
      },
      { status: 200 }
    );
  }
});