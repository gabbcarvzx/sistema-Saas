import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CreditCard,
  Lock,
  Mail,
  Settings,
} from "lucide-react";

type BillingBlockedPageProps = {
  searchParams?: {
    tenant?: string;
    reason?: string;
  };
};

const reasonLabels: Record<string, string> = {
  TRIAL_ACTIVE: "Seu periodo de teste esta ativo.",
  PLAN_ACTIVE: "Sua assinatura esta ativa.",
  SUBSCRIPTION_EXPIRED:
    "O periodo pago terminou. Renove para liberar novamente o painel operacional.",
  SUBSCRIPTION_BLOCKED:
    "Sua assinatura esta bloqueada. Renove o pagamento para retomar o uso.",
  SUBSCRIPTION_CANCELED:
    "Sua assinatura foi cancelada. Escolha um plano para voltar a operar.",
  TENANT_SUSPENDED: "Este cliente esta suspenso.",
  SUBSCRIPTION_MISSING: "Nenhuma assinatura ativa foi encontrada.",
  TENANT_ACCESS_UNAVAILABLE:
    "Nao conseguimos validar sua assinatura agora. Tente novamente em instantes.",
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
    <main className="flex min-h-screen items-center justify-center bg-[#101418] px-4 py-10 text-slate-100">
      <section className="w-full max-w-3xl rounded-lg border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/25 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-rose-400/10 text-rose-300">
              <Lock size={24} />
            </div>

            <p className="mt-5 text-sm font-semibold text-rose-200">
              Assinatura pendente
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Seu acesso operacional esta bloqueado
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">{message}</p>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Voce ainda pode acessar Assinatura e Conta para renovar, conferir
              dados do cliente ou falar com o suporte.
            </p>
          </div>

          <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-4 text-amber-100 lg:w-72">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5" size={20} />
              <div>
                <h2 className="text-sm font-semibold">Renovacao mensal</h2>
                <p className="mt-1 text-sm leading-6">
                  O pagamento aprovado pelo Mercado Pago libera mais 30 dias de
                  uso.
                </p>
              </div>
            </div>
          </div>
        </div>

        {tenant && (
          <p className="mt-6 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-300">
            Cliente: <span className="font-semibold">{tenant}</span>
          </p>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Link
            href="/app/billing"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
          >
            <CreditCard size={18} />
            Renovar agora
          </Link>
          <Link
            href="/app/account"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 px-4 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06]"
          >
            <Settings size={18} />
            Ver conta
          </Link>
          <Link
            href={`mailto:${supportEmail}?subject=${supportSubject}`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 px-4 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06]"
          >
            <Mail size={18} />
            Suporte
          </Link>
        </div>

        <Link
          href="/app/billing"
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 transition hover:text-cyan-100"
        >
          Ir para a pagina de assinatura
          <ArrowRight size={16} />
        </Link>
      </section>
    </main>
  );
}
