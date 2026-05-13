import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Building2,
  DollarSign,
  LayoutDashboard,
  PackagePlus,
  Store,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const numberFormat = new Intl.NumberFormat("pt-BR");

export default async function DashboardPage() {
  const tenant = await getTenantContext();
  const [totalProducts, missingProducts, stockProducts, stores] =
    await Promise.all([
      prisma.product.count({
        where: {
          tenantId: tenant.id,
        },
      }),
      prisma.product.count({
        where: {
          tenantId: tenant.id,
          quantity: {
            lte: prisma.product.fields.minStock,
          },
        },
      }),
      prisma.product.findMany({
        where: {
          tenantId: tenant.id,
        },
        select: {
          price: true,
          quantity: true,
        },
      }),
      prisma.store.findMany({
        where: {
          tenantId: tenant.id,
        },
        include: {
          _count: {
            select: {
              products: true,
            },
          },
          products: {
            select: {
              price: true,
              quantity: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      }),
    ]);

  const totalStockValue = stockProducts.reduce(
    (total, product) => total + product.price * product.quantity,
    0,
  );

  const totalUnits = stockProducts.reduce(
    (total, product) => total + product.quantity,
    0,
  );

  const storesWithTotals = stores.map((store) => ({
    id: store.id,
    name: store.name,
    location: store.location,
    productCount: store._count.products,
    stockValue: store.products.reduce(
      (total, product) => total + product.price * product.quantity,
      0,
    ),
  }));

  const maxStoreProducts = Math.max(
    1,
    ...storesWithTotals.map((store) => store.productCount),
  );

  const cards = [
    {
      label: "Total de produtos",
      value: numberFormat.format(totalProducts),
      helper: `${numberFormat.format(totalUnits)} unidades cadastradas`,
      icon: Boxes,
      tone: "text-cyan-300",
      bg: "bg-cyan-400/10",
    },
    {
      label: "Produtos em falta",
      value: numberFormat.format(missingProducts),
      helper: "quantity <= minStock",
      icon: AlertTriangle,
      tone: "text-rose-300",
      bg: "bg-rose-400/10",
    },
    {
      label: "Lojas ativas",
      value: numberFormat.format(stores.length),
      helper: "Unidades com estoque integrado",
      icon: Building2,
      tone: "text-emerald-300",
      bg: "bg-emerald-400/10",
    },
    {
      label: "Valor total do estoque",
      value: currency.format(totalStockValue),
      helper: "Soma de preco x quantidade",
      icon: DollarSign,
      tone: "text-amber-300",
      bg: "bg-amber-400/10",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-white/10 bg-slate-950/95 px-5 py-6 shadow-2xl shadow-black/30 lg:flex lg:flex-col">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-950/40">
            <LayoutDashboard size={24} strokeWidth={2.4} />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight">StockPro</p>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              ERP
            </p>
          </div>
        </div>

        <nav className="mt-10 space-y-1">
          {[
            {
              label: "Dashboard",
              href: "/dashboard",
              icon: LayoutDashboard,
              active: true,
            },
            { label: "Produtos", href: "/", icon: PackagePlus, active: false },
            {
              label: "Produtos em Falta",
              href: "/produtos-em-falta",
              icon: AlertTriangle,
              active: false,
            },
            { label: "Lojas", href: "/dashboard/lojas", icon: Store, active: false },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
                item.active
                  ? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-950/30"
                  : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto rounded-lg border border-white/10 bg-white/[0.04] p-4 shadow-xl shadow-black/10">
          <p className="text-sm font-semibold">Visao executiva</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Indicadores consolidados para decisao rapida de compras e
            reposicao.
          </p>
        </div>
      </aside>

      <main className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0f172a]/90 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-cyan-300">
                Painel gerencial
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Dashboard de Estoque
              </h1>
            </div>

            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-300"
            >
              <PackagePlus size={18} />
              Gerenciar produtos
            </Link>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <article className="rounded-lg border border-white/10 bg-white/[0.04] shadow-xl shadow-black/10">
              <div className="flex flex-col gap-3 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Total por loja</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Distribuicao de produtos por unidade.
                  </p>
                </div>
                <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2 text-sm font-semibold text-slate-300">
                  <BarChart3 size={17} />
                  {numberFormat.format(totalProducts)} produtos
                </div>
              </div>

              <div className="divide-y divide-white/10">
                {storesWithTotals.length === 0 ? (
                  <div className="px-5 py-12 text-center text-sm text-slate-500">
                    Nenhuma loja cadastrada.
                  </div>
                ) : (
                  storesWithTotals.map((store) => (
                    <div key={store.id} className="px-5 py-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-white">
                            {store.name}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {store.location ?? "Localizacao nao informada"}
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-lg font-semibold text-cyan-300">
                            {numberFormat.format(store.productCount)}
                          </p>
                          <p className="text-xs text-slate-500">produtos</p>
                        </div>
                      </div>

                      <div className="mt-4 h-2 rounded-full bg-slate-800">
                        <div
                          className="h-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-950/30"
                          style={{
                            width: `${Math.max(
                              4,
                              (store.productCount / maxStoreProducts) * 100,
                            )}%`,
                          }}
                        />
                      </div>

                      <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                        <span>Valor em estoque</span>
                        <span className="font-medium text-slate-300">
                          {currency.format(store.stockValue)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Saude do estoque</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Indicador rapido de reposicao.
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
                  <ArrowUpRight size={21} />
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Produtos em dia</span>
                    <span className="font-semibold text-emerald-300">
                      {numberFormat.format(
                        Math.max(0, totalProducts - missingProducts),
                      )}
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-emerald-400"
                      style={{
                        width: `${
                          totalProducts === 0
                            ? 0
                            : ((totalProducts - missingProducts) /
                                totalProducts) *
                              100
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-rose-400/20 bg-rose-400/10 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 text-rose-300" size={19} />
                    <div>
                      <p className="text-sm font-semibold text-rose-200">
                        {numberFormat.format(missingProducts)} produto(s) exigem
                        atencao
                      </p>
                      <p className="mt-1 text-sm leading-5 text-rose-100/70">
                        Priorize compras quando a quantidade estiver abaixo ou
                        igual ao estoque minimo configurado.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
