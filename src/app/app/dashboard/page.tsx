import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CalendarClock,
  CreditCard,
  PackageCheck,
  Store,
} from "lucide-react";
import { getAppContext } from "@/lib/app-context";
import { prisma } from "@/lib/prisma";

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

export default async function DashboardPage() {
  const { tenant } = await getAppContext();
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
  const trialDaysLeft = daysUntil(subscription?.trialEndsAt);
  const totalStockValue = products.reduce(
    (total, product) => total + product.price * product.quantity,
    0,
  );
  const healthyProducts = Math.max(0, totalProducts - outOfStock - lowStock);

  const cards = [
    {
      label: "Total de produtos",
      value: numberFormat.format(totalProducts),
      helper: `${currency.format(totalStockValue)} em estoque`,
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
      helper: "Abaixo do minimo definido",
      icon: PackageCheck,
      tone: "text-amber-200",
      bg: "bg-amber-400/10",
    },
    {
      label: "Lojas",
      value: numberFormat.format(storesCount),
      helper: "Unidades do tenant atual",
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
            Controle seu estoque antes que ele vire prejuizo
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Visao rapida de produtos, lojas, ruptura e assinatura para tomada
            de decisao diaria.
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
                Saude do estoque
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Separacao entre itens saudaveis, baixo estoque e ruptura.
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
            {[
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
                    style={{
                      width: `${
                        totalProducts === 0 ? 0 : (item.value / totalProducts) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
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
                    {subscription?.plan.name ?? "Sem plano"} ·{" "}
                    {subscription?.status ?? "MISSING"}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-slate-300">
                <CalendarClock size={17} />
                {subscription?.status === "TRIAL" && trialDaysLeft !== null
                  ? `${trialDaysLeft} dia(s) restantes de trial`
                  : "Periodo comercial controlado pelo billing"}
              </div>
            </div>

            <div className="divide-y divide-white/10 rounded-lg border border-white/10">
              {stores.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">
                  Nenhuma loja cadastrada.
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
                        {store.location ?? "Localizacao nao informada"}
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
