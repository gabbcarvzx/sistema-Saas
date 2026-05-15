import Link from "next/link";
import { Lock, CreditCard, RefreshCcw } from "lucide-react";

type BillingBlockedPageProps = {
  searchParams?: {
    tenant?: string;
    reason?: string;
  };
};

const reasonLabels: Record<string, string> = {
  TRIAL_ACTIVE: "Seu periodo de teste esta ativo.",
  PLAN_ACTIVE: "Sua assinatura esta ativa.",
  SUBSCRIPTION_BLOCKED: "Sua assinatura esta bloqueada.",
  SUBSCRIPTION_CANCELED: "Sua assinatura foi cancelada.",
  TENANT_SUSPENDED: "Este cliente esta suspenso.",
  SUBSCRIPTION_MISSING: "Nenhuma assinatura ativa foi encontrada.",
};

export default function BillingBlockedPage({
  searchParams,
}: BillingBlockedPageProps) {
  const reason = searchParams?.reason ?? "SUBSCRIPTION_BLOCKED";
  const message = reasonLabels[reason] ?? "O acesso ao sistema esta bloqueado.";
  const tenant = searchParams?.tenant;
  const supportEmail = process.env.SUPPORT_EMAIL ?? "suporte@stockpro.local";
  const supportSubject = encodeURIComponent(
    `Renovar assinatura ${tenant ?? ""}`.trim(),
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0f172a] px-4 text-slate-100">
      <section className="w-full max-w-xl rounded-lg border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-rose-400/10 text-rose-300">
          <Lock size={24} />
        </div>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white">
          Acesso bloqueado
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">{message}</p>

        {tenant && (
          <p className="mt-4 rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-300">
            Cliente: <span className="font-semibold">{tenant}</span>
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/app/billing"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            <CreditCard size={18} />
            Atualizar pagamento
          </Link>
          <Link
            href={`mailto:${supportEmail}?subject=${supportSubject}`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 px-4 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06]"
          >
            Falar com suporte
          </Link>
          <Link
            href="/app"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 px-4 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06]"
          >
            <RefreshCcw size={18} />
            Tentar novamente
          </Link>
        </div>
      </section>
    </main>
  );
}
