import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  GraduationCap,
  PackageCheck,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Store,
} from "lucide-react";
import { getAppContext } from "@/lib/app-context";
import { prisma } from "@/lib/prisma";
import { CheckoutButton } from "@/app/app/billing/checkout-button";

export const dynamic = "force-dynamic";

const numberFormat = new Intl.NumberFormat("pt-BR");
const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function daysUntil(date: Date | null | undefined) {
  if (!date) {
    return null;
  }

  return Math.max(
    0,
    Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );
}

function isPast(date: Date | null | undefined) {
  return date ? date.getTime() < Date.now() : false;
}

function formatDate(date: Date | null | undefined) {
  return date
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(date)
    : "Nao informado";
}

function subscriptionLabel(status: string | undefined) {
  const labels: Record<string, string> = {
    TRIAL: "Teste gratuito",
    ACTIVE: "Ativo",
    BLOCKED: "Bloqueado",
    CANCELED: "Cancelado",
    MISSING: "Sem assinatura",
  };

  return labels[status ?? "MISSING"] ?? status ?? "Sem assinatura";
}

type PaidPlanCode = "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

function paidPlanCode(code: string | null | undefined): PaidPlanCode {
  if (code === "STARTER" || code === "PROFESSIONAL" || code === "ENTERPRISE") {
    return code;
  }

  return "PROFESSIONAL";
}

function subscriptionBannerTone(options: {
  status: string | undefined;
  isExpired: boolean;
  isRenewalWindow: boolean;
}) {
  if (
    options.isExpired ||
    options.status === "BLOCKED" ||
    options.status === "CANCELED"
  ) {
    return {
      wrapper: "border-rose-400/25 bg-rose-400/10",
      icon: "bg-rose-400/10 text-rose-200",
      badge: "border-rose-400/20 bg-rose-400/10 text-rose-100",
      title: "Assinatura vencida",
      description:
        "Renove pelo Mercado Pago para liberar novamente as telas operacionais.",
    };
  }

  if (options.isRenewalWindow) {
    return {
      wrapper: "border-amber-400/25 bg-amber-400/10",
      icon: "bg-amber-400/10 text-amber-200",
      badge: "border-amber-400/20 bg-amber-400/10 text-amber-100",
      title: "Renovacao proxima",
      description:
        "Seu periodo atual esta perto do vencimento. Renove agora para manter a operacao sem interrupcao.",
    };
  }

  if (options.status === "TRIAL") {
    return {
      wrapper: "border-cyan-300/20 bg-cyan-300/10",
      icon: "bg-cyan-300/10 text-cyan-200",
      badge: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
      title: "Teste gratuito ativo",
      description:
        "Use o periodo de teste para cadastrar lojas e produtos. Quando estiver pronto, assine um plano mensal.",
    };
  }

  return {
    wrapper: "border-emerald-400/20 bg-emerald-400/10",
    icon: "bg-emerald-400/10 text-emerald-200",
    badge: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
    title: "Assinatura ativa",
    description:
      "Seu acesso esta liberado. A renovacao manual adiciona mais 30 dias apos o pagamento aprovado.",
  };
}

function subscriptionPeriodEnd(
  subscription: {
    status: string;
    trialEndsAt: Date | null;
    currentPeriodEnd: Date | null;
  } | null,
) {
  if (!subscription) {
    return null;
  }

  return subscription.status === "TRIAL"
    ? subscription.trialEndsAt
    : subscription.currentPeriodEnd;
}

export default async function DashboardPage() {
  const { tenant, user } = await getAppContext();
  const [totalProducts, outOfStock, lowStock, storesCount, products, stores] =
    await Promise.all([
      prisma.product.count({ where: { tenantId: tenant.id } }),
      prisma.product.count({ where: { tenantId: tenant.id, quantity: 0 } }),
      prisma.product.count({
        where: {
          tenantId: tenant.id,
          quantity: {
            gt: 0,
            lte: prisma.product.fields.minStock,
          },
        },
      }),
      prisma.store.count({ where: { tenantId: tenant.id } }),
      prisma.product.findMany({
        where: { tenantId: tenant.id },
        select: { price: true, quantity: true },
      }),
      prisma.store.findMany({
        where: { tenantId: tenant.id },
        select: {
          id: true,
          name: true,
          location: true,
          _count: { select: { products: true } },
        },
        orderBy: { name: "asc" },
        take: 5,
      }),
    ]);

  const subscription = tenant.subscription;
  const periodEnd = subscriptionPeriodEnd(subscription);
  const subscriptionDaysLeft = daysUntil(periodEnd);
  const subscriptionExpired = isPast(periodEnd);
  const subscriptionPlanCode = paidPlanCode(subscription?.plan.code);
  const isRenewalWindow =
    subscription?.status === "ACTIVE" &&
    subscriptionDaysLeft !== null &&
    subscriptionDaysLeft <= 7;
  const bannerTone = subscriptionBannerTone({
    status: subscription?.status,
    isExpired: subscriptionExpired,
    isRenewalWindow,
  });
  const trialDaysLeft = daysUntil(subscription?.trialEndsAt);
  const totalStockValue = products.reduce(
    (total, product) => total + product.price * product.quantity,
    0,
  );
  const healthyProducts = Math.max(0, totalProducts - outOfStock - lowStock);

  const onboardingTasks = [
    {
      title: "Cadastre ou revise sua primeira loja",
      description:
        "Defina onde o estoque será acompanhado: matriz, filial ou estoque central.",
      href: "/app/stores",
      cta: storesCount > 0 ? "Ver lojas" : "Criar loja",
      done: storesCount > 0,
      icon: Store,
    },
    {
      title: "Cadastre seus primeiros produtos",
      description:
        "Inclua SKU, preço, quantidade e estoque mínimo para receber alertas.",
      href: "/app/products",
      cta: totalProducts > 0 ? "Ver produtos" : "Adicionar produto",
      done: totalProducts > 0,
      icon: Plus,
    },
    {
      title: "Veja o treinamento rápido",
      description:
        "Aprenda o fluxo ideal para organizar a operação nos primeiros minutos.",
      href: "/app/training",
      cta: "Abrir treinamento",
      done: false,
      icon: GraduationCap,
    },
  ];
  const completedOnboardingTasks = onboardingTasks.filter((task) => task.done)
    .length;
  const onboardingProgress =
    (completedOnboardingTasks / onboardingTasks.length) * 100;
  const showOnboarding = totalProducts < 5 || storesCount < 2;

  const cards = [
    {
      label: "Total de produtos",
      value: numberFormat.format(totalProducts),
      helper:
        totalProducts > 0
          ? `${currency.format(totalStockValue)} em estoque`
          : "Comece cadastrando seus itens principais",
      icon: Boxes,
      tone: "text-cyan-200",
      bg: "bg-cyan-400/10",
    },
    {
      label: "Em falta",
      value: numberFormat.format(outOfStock),
      helper: "Quantidade igual a zero",
      icon: AlertTriangle,
      tone: "text-rose-200",
      bg: "bg-rose-400/10",
    },
    {
      label: "Baixo estoque",
      value: numberFormat.format(lowStock),
      helper: "Abaixo do mínimo definido",
      icon: PackageCheck,
      tone: "text-amber-200",
      bg: "bg-amber-400/10",
    },
    {
      label: "Lojas",
      value: numberFormat.format(storesCount),
      helper: "Unidades acompanhadas neste tenant",
      icon: Store,
      tone: "text-emerald-200",
      bg: "bg-emerald-400/10",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-cyan-300">
            Dashboard executivo
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Controle seu estoque antes que ele vire prejuízo
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Visão rápida de produtos, lojas, ruptura e assinatura para decidir
            reposição com mais segurança todos os dias.
          </p>
        </div>

        {subscription?.status === "TRIAL" && (
          <Link
            href="/app/billing"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
          >
            Fazer upgrade
            <ArrowRight size={18} />
          </Link>
        )}
      </section>

      <section
        className={`rounded-lg border p-5 shadow-xl shadow-black/10 ${bannerTone.wrapper}`}
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${bannerTone.icon}`}
            >
              {subscriptionExpired ? (
                <ShieldAlert size={23} />
              ) : isRenewalWindow ? (
                <Clock3 size={23} />
              ) : (
                <ShieldCheck size={23} />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-white">
                  {bannerTone.title}
                </h2>
                <span
                  className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${bannerTone.badge}`}
                >
                  {subscriptionLabel(subscription?.status)}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                {bannerTone.description}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:w-[560px]">
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Vencimento
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {formatDate(periodEnd)}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Dias restantes
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {subscriptionDaysLeft === null
                  ? "Sem data"
                  : subscriptionExpired
                    ? "Expirado"
                    : `${subscriptionDaysLeft} dia(s)`}
              </p>
            </div>
            <CheckoutButton
              label={
                subscription?.status === "TRIAL"
                  ? "Assinar agora"
                  : "Renovar agora"
              }
              payerEmail={user.email}
              plan={subscriptionPlanCode}
            />
          </div>
        </div>
      </section>

      {showOnboarding && (
        <section className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-5 shadow-xl shadow-black/10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-cyan-200">
                Comece por aqui
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
                Configure o básico para transformar dados em rotina
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Em poucos passos você deixa o sistema pronto para acompanhar
                estoque, evitar compras no escuro e priorizar reposição.
              </p>
            </div>
            <div className="w-full rounded-lg border border-white/10 bg-black/20 p-4 lg:w-72">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-white">
                  Progresso inicial
                </span>
                <span className="text-slate-300">
                  {completedOnboardingTasks}/{onboardingTasks.length}
                </span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-black/40">
                <div
                  className="h-2 rounded-full bg-cyan-300"
                  style={{ width: `${onboardingProgress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {onboardingTasks.map((task) => (
              <Link
                key={task.title}
                href={task.href}
                className="rounded-lg border border-white/10 bg-[#111820] p-4 transition hover:border-cyan-300/50 hover:bg-[#13202a]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.06] text-cyan-200">
                    <task.icon size={19} />
                  </div>
                  {task.done ? (
                    <CheckCircle2 className="text-emerald-300" size={19} />
                  ) : (
                    <span className="rounded-md bg-cyan-300 px-2 py-1 text-xs font-semibold text-slate-950">
                      Pendente
                    </span>
                  )}
                </div>
                <h3 className="mt-4 text-sm font-semibold text-white">
                  {task.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {task.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200">
                  {task.cta}
                  <ArrowRight size={16} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.label}
            className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-400">
                  {card.label}
                </p>
                <p className="mt-4 text-3xl font-semibold tracking-tight text-white">
                  {card.value}
                </p>
              </div>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${card.bg} ${card.tone}`}
              >
                <card.icon size={23} />
              </div>
            </div>
            <p className="mt-5 text-sm text-slate-500">{card.helper}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-lg border border-white/10 bg-white/[0.04] shadow-xl shadow-black/10">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 p-5">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Saúde do estoque
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Separação entre itens saudáveis, baixo estoque e ruptura.
              </p>
            </div>
            <Link
              href="/app/products"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-white/10 px-3 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06]"
            >
              Produtos
            </Link>
          </div>

          <div className="space-y-5 p-5">
            {totalProducts === 0 ? (
              <div className="rounded-lg border border-white/10 bg-black/20 p-5">
                <PackageCheck className="text-cyan-300" size={24} />
                <h3 className="mt-4 font-semibold text-white">
                  Seu painel fica mais útil depois do primeiro produto
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Cadastre os itens mais vendidos para acompanhar quantidade,
                  valor em estoque e alertas de reposição em tempo real.
                </p>
                <Link
                  href="/app/products"
                  className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                >
                  Cadastrar produto
                  <ArrowRight size={17} />
                </Link>
              </div>
            ) : (
              [
                {
                  label: "Em dia",
                  value: healthyProducts,
                  color: "bg-emerald-300",
                },
                {
                  label: "Baixo estoque",
                  value: lowStock,
                  color: "bg-amber-300",
                },
                {
                  label: "Em falta",
                  value: outOfStock,
                  color: "bg-rose-300",
                },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-400">{item.label}</span>
                    <span className="font-semibold text-white">
                      {numberFormat.format(item.value)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-black/30">
                    <div
                      className={`h-2 rounded-full ${item.color}`}
                      style={{ width: `${(item.value / totalProducts) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-lg border border-white/10 bg-white/[0.04] shadow-xl shadow-black/10">
          <div className="border-b border-white/10 p-5">
            <h2 className="text-lg font-semibold text-white">
              Assinatura e lojas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Estado comercial do tenant e unidades cadastradas.
            </p>
          </div>

          <div className="space-y-4 p-5">
            <div className="rounded-lg border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-200">
                  <CreditCard size={20} />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Plano atual</p>
                  <p className="font-semibold text-white">
                    {subscription?.plan.name ?? "Sem plano"} -{" "}
                    {subscriptionLabel(subscription?.status)}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-slate-300">
                <CalendarClock size={17} />
                {subscription?.status === "TRIAL" && trialDaysLeft !== null
                  ? `${trialDaysLeft} dia(s) restantes de teste gratuito`
                  : "Período comercial liberado pelo pagamento mensal"}
              </div>
            </div>

            <div className="divide-y divide-white/10 rounded-lg border border-white/10">
              {stores.length === 0 ? (
                <div className="p-4 text-sm leading-6 text-slate-400">
                  Nenhuma loja cadastrada. Crie uma unidade para separar
                  estoque por ponto de venda e enxergar onde cada produto está.
                </div>
              ) : (
                stores.map((store) => (
                  <div
                    key={store.id}
                    className="flex items-center justify-between gap-4 p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {store.name}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {store.location ?? "Localização não informada"}
                      </p>
                    </div>
                    <span className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-slate-300">
                      {store._count.products}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
