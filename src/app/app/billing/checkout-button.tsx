"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";

type CheckoutButtonProps = {
  label: string;
  plan: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  payerEmail: string;
};

type CheckoutResponse = {
  checkoutUrl?: string;
  message?: string;
};

export function CheckoutButton({ label, payerEmail, plan }: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function startCheckout() {
    setIsLoading(true);
    setFeedback(null);

    const origin = window.location.origin;
    const response = await fetch("/api/billing/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "MERCADO_PAGO",
        plan,
        payerEmail,
        successUrl: `${origin}/app/billing?checkout=success`,
        cancelUrl: `${origin}/app/billing?checkout=cancel`,
      }),
    });
    const body = (await response.json().catch(() => ({}))) as CheckoutResponse;

    if (!response.ok || !body.checkoutUrl) {
      setFeedback(body.message ?? "Nao foi possivel iniciar o checkout.");
      setIsLoading(false);
      return;
    }

    window.location.href = body.checkoutUrl;
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
