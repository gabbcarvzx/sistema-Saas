"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";

type CheckoutButtonProps = {
  label: string;
  plan: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  payerEmail: string;
};

type CheckoutResponse = {
  code?: string;
  checkoutUrl?: string;
  redirectUrl?: string;
  message?: string;
};

function friendlyCheckoutMessage(status: number, body: CheckoutResponse) {
  if (body.code === "BILLING_PAYER_EMAIL_REQUIRED") {
    return "Não conseguimos identificar o email da conta. Atualize seus dados e tente novamente.";
  }

  if (body.code === "CONFIGURATION_ERROR") {
    return "Checkout temporariamente indisponível. Nossa equipe precisa revisar a configuração de pagamento.";
  }

  if (status >= 500) {
    return "Não foi possível conectar ao Mercado Pago agora. Tente novamente em alguns minutos.";
  }

  return body.message ?? "Não foi possível iniciar o checkout.";
}

export function CheckoutButton({ label, payerEmail, plan }: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function startCheckout() {
    setIsLoading(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "MERCADO_PAGO",
          plan,
          payerEmail,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as CheckoutResponse;

      const redirectUrl = body.redirectUrl ?? body.checkoutUrl;

      if (!response.ok || !redirectUrl) {
        setFeedback(friendlyCheckoutMessage(response.status, body));
        setIsLoading(false);
        return;
      }

      window.location.href = redirectUrl;
    } catch {
      setFeedback("Não foi possível iniciar o checkout. Verifique sua conexão e tente novamente.");
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void startCheckout()}
        disabled={isLoading}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={18} />}
        {label}
      </button>
      {feedback && (
        <p className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
          {feedback}
        </p>
      )}
    </div>
  );
}
