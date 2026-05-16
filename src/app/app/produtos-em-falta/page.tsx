import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, TriangleAlert } from "lucide-react";
import { getTenantContext } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";

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
    orderBy: [{ quantity: "asc" }, { name: "asc" }],
  });

  const outOfStock = products.filter((product) => product.quantity === 0);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-rose-300">
            Reposição prioritária
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Produtos em falta ou com estoque baixo
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Priorize a reposição dos itens que podem travar vendas, atendimento
            ou produção.
          </p>
        </div>
        <Link
          href="/app/products"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 px-4 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06]"
        >
          Gerenciar produtos
          <ArrowRight size={18} />
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-slate-400">Com alerta</p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {products.length}
          </p>
        </article>
        <article className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-slate-400">Zerados</p>
          <p className="mt-3 text-3xl font-semibold text-rose-200">
            {outOfStock.length}
          </p>
        </article>
        <article className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-slate-400">Regra</p>
          <p className="mt-3 text-lg font-semibold text-white">
            Estoque atual &lt;= mínimo
          </p>
        </article>
      </section>

      <article className="rounded-lg border border-white/10 bg-white/[0.04] shadow-xl shadow-black/10">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 p-5">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Itens para reposição
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Ordenados pela menor quantidade em estoque para acelerar a compra.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm font-semibold text-rose-200">
            <TriangleAlert size={17} />
            Estoque baixo
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Produto</th>
                <th className="px-5 py-4 font-semibold">SKU</th>
                <th className="px-5 py-4 font-semibold">Qtd.</th>
                <th className="px-5 py-4 font-semibold">Min.</th>
                <th className="px-5 py-4 font-semibold">Preco</th>
                <th className="px-5 py-4 font-semibold">Categoria</th>
                <th className="px-5 py-4 font-semibold">Loja</th>
                <th className="px-5 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {products.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center"
                  >
                    <div className="mx-auto max-w-md">
                      <CheckIcon />
                      <h3 className="mt-4 text-base font-semibold text-white">
                        Nenhum produto com estoque baixo agora
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        Ótimo sinal: seus produtos cadastrados estão acima do
                        mínimo definido. Continue revisando os alertas antes de
                        fazer novas compras.
                      </p>
                      <Link
                        href="/app/products"
                        className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                      >
                        Ver produtos
                        <ArrowRight size={17} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="text-sm">
                    <td className="px-5 py-4 font-medium text-white">
                      {product.name}
                    </td>
                    <td className="px-5 py-4 text-slate-400">{product.code}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-md bg-rose-400/10 px-2 py-1 text-xs font-semibold text-rose-200">
                        {product.quantity}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-400">
                      {product.minStock}
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {currency.format(product.price)}
                    </td>
                    <td className="px-5 py-4 text-slate-400">
                      {product.category}
                    </td>
                    <td className="px-5 py-4 text-slate-400">
                      {product.store.name}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-2 py-1 text-xs font-semibold text-rose-200 ring-1 ring-rose-400/20">
                        <AlertTriangle size={13} />
                        {product.quantity === 0 ? "Em falta" : "Baixo estoque"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}

function CheckIcon() {
  return (
    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
      <CheckCircle2 size={24} />
    </span>
  );
}
