import { CalendarClock, CheckCircle2, CreditCard, ShieldAlert } from "lucide-react";
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
    description: "Para negocios pequenos com estoque enxuto.",
  },
  {
    code: "PROFESSIONAL" as const,
    name: "Pro",
    priceCents: 7900,
    description: "Mais escolhido para operacao com lojas e alertas.",
    featured: true,
  },
  {
    code: "ENTERPRISE" as const,
    name: "Business",
    priceCents: 14900,
    description: "Para operacoes com mais unidades e volume.",
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
    : "Nao informado";
}

function checkoutFeedback(checkout: string | undefined) {
  if (checkout === "success") {
    return {
      tone: "success" as const,
      title: "Pagamento em processamento",
      message:
        "Assim que o Mercado Pago confirmar a autorizacao, sua assinatura sera ativada automaticamente.",
    };
  }

  if (checkout === "cancel") {
    return {
      tone: "warning" as const,
      title: "Checkout cancelado",
      message:
        "Voce pode tentar novamente quando quiser. O acesso de recuperacao continua disponivel com sua sessao valida.",
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
    status === "BLOCKED" || status === "CANCELED"
      ? "Atualizar pagamento"
      : "Assinar agora";

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
        <p className="text-sm font-semibold text-cyan-300">
          Billing e assinatura
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Controle comercial do tenant
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Esta pagina continua acessivel para tenants bloqueados com sessao
          valida, permitindo recuperacao de pagamento sem abrir dados
          operacionais.
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
          <dl className="mt-5 space-y-4">
            {[
              ["Plano", subscription?.plan.name ?? "Trial"],
              ["Status", status],
              ["Fim do trial", formatDate(subscription?.trialEndsAt)],
              ["Fim do periodo atual", formatDate(subscription?.currentPeriodEnd)],
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
                  ? "Sua assinatura esta ativa e pronta para operacao."
                  : "Escolha um plano para liberar ou manter a operacao comercial."}
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
                <li>Alertas de estoque minimo</li>
                <li>Checkout recorrente Mercado Pago</li>
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
        <div className="flex items-start gap-3">
          <CalendarClock className="mt-0.5 text-cyan-300" size={20} />
          <p className="text-sm leading-6 text-slate-400">
            Fluxo comercial: anuncio, landing page, pricing/signup, trial,
            checkout e ativacao por webhook de pagamento.
          </p>
        </div>
      </section>
    </div>
  );
}
