import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  PackagePlus,
  Store,
  TriangleAlert,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function MissingProductsPage() {
  const tenant = await getTenantContext();
  const products = await prisma.product.findMany({
    where: {
      tenantId: tenant.id,
      quantity: {
        lte: prisma.product.fields.minStock,
      },
    },
    include: {
      store: true,
    },
    orderBy: [
      {
        quantity: "asc",
      },
      {
        name: "asc",
      },
    ],
  });

  const criticalProducts = products.filter((product) => product.quantity === 0);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-white/10 bg-slate-950/95 px-5 py-6 shadow-2xl shadow-black/30 lg:flex lg:flex-col">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-rose-400 text-slate-950 shadow-lg shadow-rose-950/40">
            <AlertTriangle size={24} strokeWidth={2.4} />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight">StockPro</p>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Alertas
            </p>
          </div>
        </div>

        <nav className="mt-10 space-y-1">
          {[
            { label: "Dashboard", href: "/dashboard", icon: Boxes, active: false },
            { label: "Produtos", href: "/", icon: PackagePlus, active: false },
            {
              label: "Produtos em Falta",
              href: "/produtos-em-falta",
              icon: AlertTriangle,
              active: true,
            },
            { label: "Lojas", href: "/dashboard/lojas", icon: Store, active: false },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
                item.active
                  ? "bg-rose-400 text-slate-950 shadow-lg shadow-rose-950/30"
                  : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto rounded-lg border border-white/10 bg-white/[0.04] p-4 shadow-xl shadow-black/10">
          <p className="text-sm font-semibold">Resumo de alertas</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-2xl font-semibold text-rose-300">
                {products.length}
              </p>
              <p className="text-xs text-slate-500">Baixo estoque</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-amber-300">
                {criticalProducts.length}
              </p>
              <p className="text-xs text-slate-500">Zerados</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0f172a]/90 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-rose-300">
                Monitoramento de estoque
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Produtos em Falta
              </h1>
            </div>

            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-300 shadow-lg shadow-black/10 transition hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowUpRight size={18} />
              Gerenciar produtos
            </Link>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <article className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
              <p className="text-sm font-medium text-slate-400">
                Produtos com alerta
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
                {products.length}
              </p>
            </article>
            <article className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
              <p className="text-sm font-medium text-slate-400">
                Produtos zerados
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-amber-300">
                {criticalProducts.length}
              </p>
            </article>
            <article className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
              <p className="text-sm font-medium text-slate-400">
                Regra aplicada
              </p>
              <p className="mt-3 text-lg font-semibold tracking-tight text-white">
                quantity &lt;= minStock
              </p>
            </article>
          </div>

          <article className="mt-6 rounded-lg border border-white/10 bg-white/[0.04] shadow-xl shadow-black/10">
            <div className="flex flex-col gap-3 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Itens para reposicao</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Ordenados pela menor quantidade em estoque.
                </p>
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm font-semibold text-rose-300">
                <TriangleAlert size={17} />
                Estoque Baixo
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] table-fixed text-left">
                <thead className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="w-[20%] px-4 py-4 font-semibold">Produto</th>
                    <th className="w-[15%] px-4 py-4 font-semibold">Codigo</th>
                    <th className="w-[12%] px-4 py-4 font-semibold">
                      Quantidade
                    </th>
                    <th className="w-[10%] px-4 py-4 font-semibold">Minimo</th>
                    <th className="w-[13%] px-4 py-4 font-semibold">Preco</th>
                    <th className="w-[12%] px-4 py-4 font-semibold">
                      Categoria
                    </th>
                    <th className="w-[10%] px-4 py-4 font-semibold">Loja</th>
                    <th className="w-[18%] px-4 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {products.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-12 text-center text-sm text-slate-500"
                      >
                        Nenhum produto com estoque baixo.
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product.id} className="text-sm">
                        <td className="px-4 py-4">
                          <div className="font-medium text-slate-100">
                            {product.name}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-400">
                          {product.code}
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-md bg-rose-400/10 px-2 py-1 text-xs font-semibold text-rose-300">
                            {product.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-400">
                          {product.minStock}
                        </td>
                        <td className="px-4 py-4 text-slate-300">
                          {currency.format(product.price)}
                        </td>
                        <td className="px-4 py-4 text-slate-400">
                          {product.category}
                        </td>
                        <td className="px-4 py-4 text-slate-400">
                          {product.store.name}
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-2 py-1 text-xs font-semibold text-rose-300 ring-1 ring-rose-400/20">
                            <AlertTriangle size={13} />
                            Estoque Baixo
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
