import {
  CalendarClock,
  CheckCircle2,
  CreditCard,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { getAppContext } from "@/lib/app-context";
import { CheckoutButton } from "@/app/app/billing/checkout-button";

export const dynamic = "force-dynamic";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const paidPlans = [
  {
    code: "STARTER" as const,
    name: "Starter",
    priceCents: 3900,
    description: "Para negócios pequenos com estoque enxuto.",
  },
  {
    code: "PROFESSIONAL" as const,
    name: "Pro",
    priceCents: 7900,
    description: "Mais escolhido para operação com lojas e alertas.",
    featured: true,
  },
  {
    code: "ENTERPRISE" as const,
    name: "Business",
    priceCents: 14900,
    description: "Para operações com mais unidades e volume.",
  },
];

type BillingPageProps = {
  searchParams?: {
    checkout?: string;
  };
};

function formatDate(date: Date | null | undefined) {
  return date
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(date)
    : "Não informado";
}

function subscriptionLabel(status: string) {
  const labels: Record<string, string> = {
    TRIAL: "Teste gratuito",
    ACTIVE: "Ativo",
    BLOCKED: "Bloqueado",
    CANCELED: "Cancelado",
    MISSING: "Sem assinatura",
  };

  return labels[status] ?? status;
}

function subscriptionTone(status: string) {
  if (status === "ACTIVE") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-100";
  }

  if (status === "TRIAL") {
    return "border-cyan-400/20 bg-cyan-400/10 text-cyan-100";
  }

  return "border-rose-400/20 bg-rose-400/10 text-rose-100";
}

function checkoutFeedback(checkout: string | undefined) {
  if (checkout === "success") {
    return {
      tone: "success" as const,
      title: "Pagamento em processamento",
      message:
        "Assim que o Mercado Pago confirmar o pagamento, seu período mensal será ativado automaticamente.",
    };
  }

  if (checkout === "cancel") {
    return {
      tone: "warning" as const,
      title: "Checkout cancelado",
      message:
        "Você pode tentar novamente quando quiser. O acesso de recuperação continua disponível com sua sessão válida.",
    };
  }

  return null;
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const { tenant, user } = await getAppContext();
  const subscription = tenant.subscription;
  const status = subscription?.status ?? "MISSING";
  const feedback = checkoutFeedback(searchParams?.checkout);
  const actionLabel =
    status === "ACTIVE" || status === "BLOCKED" || status === "CANCELED"
      ? "Renovar agora"
      : "Assinar agora";

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
        <p className="text-sm font-semibold text-cyan-300">
          Billing e assinatura
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Assinatura mensal do StockPro
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Pagamento mensal via Mercado Pago. Após a aprovação, o acesso é
          liberado por 30 dias e pode ser renovado manualmente quando precisar.
        </p>
      </section>

      {feedback && (
        <section
          className={`rounded-lg border p-4 ${
            feedback.tone === "success"
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
              : "border-amber-400/20 bg-amber-400/10 text-amber-100"
          }`}
        >
          <h2 className="text-sm font-semibold">{feedback.title}</h2>
          <p className="mt-1 text-sm leading-6">{feedback.message}</p>
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <article className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
            <CreditCard size={24} />
          </div>
          <h2 className="mt-5 text-lg font-semibold text-white">
            Plano atual
          </h2>
          <div
            className={`mt-4 inline-flex rounded-lg border px-3 py-2 text-sm font-semibold ${subscriptionTone(
              status,
            )}`}
          >
            {subscriptionLabel(status)}
          </div>
          <dl className="mt-5 space-y-4">
            {[
              ["Plano", subscription?.plan.name ?? "Trial"],
              ["Status", subscriptionLabel(status)],
              ["Fim do teste gratuito", formatDate(subscription?.trialEndsAt)],
              ["Fim do período atual", formatDate(subscription?.currentPeriodEnd)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-white/10 bg-black/20 p-3"
              >
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {label}
                </dt>
                <dd className="mt-1 text-sm font-semibold text-white">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 rounded-lg border border-amber-400/20 bg-amber-400/10 p-4">
            <div className="flex items-start gap-3">
              {status === "ACTIVE" ? (
                <CheckCircle2 className="mt-0.5 text-emerald-300" size={19} />
              ) : (
                <ShieldAlert className="mt-0.5 text-amber-300" size={19} />
              )}
              <p className="text-sm leading-6 text-amber-100">
                {status === "ACTIVE"
                  ? "Sua assinatura está ativa e pronta para operação."
                  : "Escolha um plano para liberar ou manter a operação comercial com segurança."}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4">
            <div className="flex items-start gap-3">
              <RefreshCw className="mt-0.5 text-cyan-300" size={18} />
              <p className="text-sm leading-6 text-slate-300">
                Nesta versão, a renovação não é automática. Você paga pelo
                Checkout Pro e recebe mais 30 dias após a confirmação.
              </p>
            </div>
          </div>
        </article>

        <div className="grid gap-4 lg:grid-cols-3">
          {paidPlans.map((plan) => (
            <article
              key={plan.code}
              className={`rounded-lg border p-5 shadow-xl shadow-black/10 ${
                plan.featured
                  ? "border-cyan-300 bg-cyan-300 text-slate-950"
                  : "border-white/10 bg-white/[0.04] text-slate-100"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{plan.name}</h2>
                {plan.featured && (
                  <span className="rounded-md bg-slate-950 px-2 py-1 text-xs font-semibold text-cyan-100">
                    Mais escolhido
                  </span>
                )}
              </div>
              <p
                className={`mt-3 text-sm leading-6 ${
                  plan.featured ? "text-slate-800" : "text-slate-400"
                }`}
              >
                {plan.description}
              </p>
              <p className="mt-6 text-3xl font-semibold">
                {currency.format(plan.priceCents / 100)}
                <span className="text-sm font-medium">/mes</span>
              </p>
              <ul
                className={`mt-5 space-y-2 text-sm ${
                  plan.featured ? "text-slate-800" : "text-slate-300"
                }`}
              >
                <li>Controle de produtos e lojas</li>
                <li>Alertas de estoque mínimo</li>
                <li>Pagamento mensal via Mercado Pago</li>
              </ul>
              <div className="mt-6">
                <CheckoutButton
                  label={actionLabel}
                  payerEmail={user.email}
                  plan={plan.code}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Checkout seguro",
              text: "Pix, cartão ou boleto dentro do ambiente Mercado Pago.",
              icon: ShieldCheck,
            },
            {
              title: "30 dias de acesso",
              text: "O webhook de pagamento aprovado atualiza seu período atual.",
              icon: CalendarClock,
            },
            {
              title: "Renovacao manual",
              text: "Quando o período acabar, volte aqui e clique em Renovar agora.",
              icon: RefreshCw,
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <item.icon className="mt-0.5 text-cyan-300" size={20} />
              <div>
                <h2 className="text-sm font-semibold text-white">{item.title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  {item.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
