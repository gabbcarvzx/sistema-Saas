"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Boxes,
  Edit3,
  Loader2,
  PackagePlus,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import {
  ProductFormData,
  ProductFormInput,
  productSchema,
} from "@/lib/product-schema";

type StoreOption = {
  id: string;
  name: string;
  location: string | null;
};

type ProductRow = ProductFormData & {
  id: string;
  createdAt: string;
  updatedAt: string;
  store: StoreOption;
};

type ApiError = {
  message?: string;
  errors?: Partial<Record<keyof ProductFormData, string[]>>;
};

const emptyProduct: ProductFormInput = {
  name: "",
  code: "",
  price: 0,
  quantity: 0,
  minStock: 0,
  category: "",
  storeId: "",
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function ProductsClient() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<ProductFormInput, unknown, ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: emptyProduct,
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);

    try {
      const [storesResponse, productsResponse] = await Promise.all([
        fetch("/api/stores", { cache: "no-store" }),
        fetch("/api/products", { cache: "no-store" }),
      ]);

      if (!storesResponse.ok || !productsResponse.ok) {
        throw new Error("Nao foi possivel carregar os dados.");
      }

      const [storesData, productsData] = (await Promise.all([
        storesResponse.json(),
        productsResponse.json(),
      ])) as [StoreOption[], ProductRow[]];

      setStores(storesData);
      setProducts(productsData);

      if (!editingProduct && storesData[0]) {
        reset({ ...emptyProduct, storeId: storesData[0].id });
      }
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Nao foi possivel carregar os dados.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [editingProduct, reset]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return products;
    }

    return products.filter((product) =>
      [product.name, product.code, product.category, product.store.name].some(
        (value) => value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [products, query]);

  const lowStockCount = products.filter(
    (product) => product.quantity <= product.minStock,
  ).length;

  function startEditing(product: ProductRow) {
    setEditingProduct(product);
    setFeedback(null);
    reset({
      name: product.name,
      code: product.code,
      price: product.price,
      quantity: product.quantity,
      minStock: product.minStock,
      category: product.category,
      storeId: product.storeId,
    });
  }

  function cancelEditing() {
    setEditingProduct(null);
    setFeedback(null);
    reset({ ...emptyProduct, storeId: stores[0]?.id ?? "" });
  }

  async function onSubmit(data: ProductFormData) {
    setIsSaving(true);
    setFeedback(null);

    const endpoint = editingProduct
      ? `/api/products/${editingProduct.id}`
      : "/api/products";

    const response = await fetch(endpoint, {
      method: editingProduct ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const body = (await response.json().catch(() => ({}))) as ApiError;

    if (!response.ok) {
      if (body.errors) {
        Object.entries(body.errors).forEach(([field, messages]) => {
          if (messages?.[0]) {
            setError(field as keyof ProductFormData, {
              message: messages[0],
            });
          }
        });
      }

      if (response.status === 409) {
        setError("code", {
          message: body.message ?? "Codigo ja cadastrado.",
        });
      }

      setFeedback(body.message ?? "Nao foi possivel salvar o produto.");
      setIsSaving(false);
      return;
    }

    setFeedback(editingProduct ? "Produto atualizado." : "Produto cadastrado.");
    setEditingProduct(null);
    reset({ ...emptyProduct, storeId: stores[0]?.id ?? "" });
    await loadData();
    setIsSaving(false);
  }

  async function deleteProduct(product: ProductRow) {
    const confirmed = window.confirm(
      `Deseja deletar o produto "${product.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(product.id);
    setFeedback(null);

    const response = await fetch(`/api/products/${product.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as ApiError;
      setFeedback(body.message ?? "Nao foi possivel deletar o produto.");
      setIsDeleting(null);
      return;
    }

    if (editingProduct?.id === product.id) {
      cancelEditing();
    }

    setProducts((current) => current.filter((item) => item.id !== product.id));
    setFeedback("Produto deletado.");
    setIsDeleting(null);
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-white/10 bg-slate-950/95 px-5 py-6 shadow-2xl shadow-black/30 lg:flex lg:flex-col">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-950/40">
            <Boxes size={24} strokeWidth={2.4} />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight">StockPro</p>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Produtos
            </p>
          </div>
        </div>

        <nav className="mt-10 space-y-1">
          {[
            { label: "Dashboard", href: "/app/dashboard", icon: Boxes, active: false },
            { label: "Produtos", href: "/app", icon: PackagePlus, active: true },
            {
              label: "Produtos em Falta",
              href: "/app/produtos-em-falta",
              icon: AlertTriangle,
              active: false,
            },
            { label: "Lojas", href: "/app/dashboard/lojas", icon: Store, active: false },
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
          <p className="text-sm font-semibold">Resumo do estoque</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-2xl font-semibold">{products.length}</p>
              <p className="text-xs text-slate-500">Produtos</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-amber-300">
                {lowStockCount}
              </p>
              <p className="text-xs text-slate-500">Em falta</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0f172a]/90 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-cyan-300">
                Cadastro e controle
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Produtos
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-slate-500 shadow-lg shadow-black/10 md:w-80">
                <Search size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por nome, codigo, categoria ou loja"
                  className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                />
              </div>
              <button
                type="button"
                onClick={() => void loadData()}
                aria-label="Atualizar produtos"
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 shadow-lg shadow-black/10 transition hover:bg-white/[0.08]"
              >
                <RefreshCcw size={18} />
              </button>
            </div>
          </div>
        </header>

        <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 2xl:grid-cols-[390px_1fr]">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="h-fit rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingProduct ? "Editar produto" : "Novo produto"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Dados salvos diretamente no banco.
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
                {editingProduct ? <Edit3 size={19} /> : <Plus size={20} />}
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <Field label="Nome" error={errors.name?.message}>
                <input
                  {...register("name")}
                  className="form-input"
                  placeholder="Filtro de oleo"
                />
              </Field>

              <Field label="Codigo" error={errors.code?.message}>
                <input
                  {...register("code")}
                  className="form-input"
                  placeholder="FO-7712"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Preco" error={errors.price?.message}>
                  <input
                    {...register("price", { valueAsNumber: true })}
                    className="form-input"
                    min="0"
                    step="0.01"
                    type="number"
                  />
                </Field>

                <Field label="Quantidade" error={errors.quantity?.message}>
                  <input
                    {...register("quantity", { valueAsNumber: true })}
                    className="form-input"
                    min="0"
                    step="1"
                    type="number"
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Estoque minimo" error={errors.minStock?.message}>
                  <input
                    {...register("minStock", { valueAsNumber: true })}
                    className="form-input"
                    min="0"
                    step="1"
                    type="number"
                  />
                </Field>

                <Field label="Categoria" error={errors.category?.message}>
                  <input
                    {...register("category")}
                    className="form-input"
                    placeholder="Pecas"
                  />
                </Field>
              </div>

              <Field label="Loja" error={errors.storeId?.message}>
                <select {...register("storeId")} className="form-input">
                  <option value="">Selecione uma loja</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {feedback && (
              <p className="mt-5 rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-300">
                {feedback}
              </p>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}
                {editingProduct ? "Salvar edicao" : "Cadastrar"}
              </button>

              {editingProduct && (
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 px-4 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06]"
                >
                  <X size={18} />
                  Cancelar
                </button>
              )}
            </div>
          </form>

          <article className="rounded-lg border border-white/10 bg-white/[0.04] shadow-xl shadow-black/10">
            <div className="flex flex-col gap-3 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Lista de produtos</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {filteredProducts.length} produto(s) encontrado(s)
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-400">
                Codigo unico por cliente
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Produto</th>
                    <th className="px-5 py-4 font-semibold">Codigo</th>
                    <th className="px-5 py-4 font-semibold">Preco</th>
                    <th className="px-5 py-4 font-semibold">Qtd.</th>
                    <th className="px-5 py-4 font-semibold">Min.</th>
                    <th className="px-5 py-4 font-semibold">Categoria</th>
                    <th className="px-5 py-4 font-semibold">Loja</th>
                    <th className="px-5 py-4 font-semibold">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-12 text-center text-sm text-slate-500"
                      >
                        Carregando produtos...
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-12 text-center text-sm text-slate-500"
                      >
                        Nenhum produto encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => {
                      const isLowStock = product.quantity <= product.minStock;

                      return (
                        <tr key={product.id} className="text-sm">
                          <td className="px-5 py-4">
                            <div className="font-medium text-slate-100">
                              {product.name}
                            </div>
                            {isLowStock && (
                              <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-400/10 px-2 py-1 text-xs font-semibold text-amber-300">
                                <AlertTriangle size={13} />
                                Estoque baixo
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4 text-slate-400">
                            {product.code}
                          </td>
                          <td className="px-5 py-4 text-slate-300">
                            {currency.format(product.price)}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`rounded-md px-2 py-1 text-xs font-semibold ${
                                isLowStock
                                  ? "bg-amber-400/10 text-amber-300"
                                  : "bg-emerald-400/10 text-emerald-300"
                              }`}
                            >
                              {product.quantity}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-400">
                            {product.minStock}
                          </td>
                          <td className="px-5 py-4 text-slate-400">
                            {product.category}
                          </td>
                          <td className="px-5 py-4 text-slate-400">
                            {product.store.name}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => startEditing(product)}
                                aria-label={`Editar ${product.name}`}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:bg-white/[0.06] hover:text-cyan-300"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteProduct(product)}
                                disabled={isDeleting === product.id}
                                aria-label={`Deletar ${product.name}`}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:bg-rose-400/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isDeleting === product.id ? (
                                  <Loader2 className="animate-spin" size={16} />
                                ) : (
                                  <Trash2 size={16} />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
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

function Field({
  children,
  error,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <div className="mt-2">{children}</div>
      {error && <span className="mt-1 block text-xs text-rose-300">{error}</span>}
    </label>
  );
}
