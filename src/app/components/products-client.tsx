"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  AlertTriangle,
  Edit3,
  Loader2,
  PackagePlus,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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

type StockFilter = "all" | "healthy" | "low" | "out";

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

function productStatus(product: ProductRow) {
  if (product.quantity === 0) {
    return "out";
  }

  if (product.quantity <= product.minStock) {
    return "low";
  }

  return "healthy";
}

function statusLabel(status: StockFilter) {
  const labels: Record<StockFilter, string> = {
    all: "Todos",
    healthy: "Em dia",
    low: "Baixo estoque",
    out: "Em falta",
  };

  return labels[status];
}

export function ProductsClient() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [storeFilter, setStoreFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
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
        throw new Error("Não foi possível carregar os dados.");
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
          : "Não foi possível carregar os dados.",
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

    return products.filter((product) => {
      const matchesQuery =
        !normalizedQuery ||
        [product.name, product.code, product.category, product.store.name].some(
          (value) => value.toLowerCase().includes(normalizedQuery),
        );
      const matchesStore =
        storeFilter === "all" || product.storeId === storeFilter;
      const matchesStatus =
        stockFilter === "all" || productStatus(product) === stockFilter;

      return matchesQuery && matchesStore && matchesStatus;
    });
  }, [products, query, stockFilter, storeFilter]);

  const totals = useMemo(
    () => ({
      all: products.length,
      healthy: products.filter((product) => productStatus(product) === "healthy")
        .length,
      low: products.filter((product) => productStatus(product) === "low").length,
      out: products.filter((product) => productStatus(product) === "out").length,
    }),
    [products],
  );

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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const body = (await response.json().catch(() => ({}))) as ApiError;

    if (!response.ok) {
      if (body.errors) {
        Object.entries(body.errors).forEach(([field, messages]) => {
          if (messages?.[0]) {
            setError(field as keyof ProductFormData, { message: messages[0] });
          }
        });
      }

      if (response.status === 409) {
        setError("code", { message: body.message ?? "SKU ja cadastrado." });
      }

      setFeedback(body.message ?? "Não foi possível salvar o produto.");
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
      `Deseja excluir o produto "${product.name}"?`,
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
      setFeedback(body.message ?? "Não foi possível excluir o produto.");
      setIsDeleting(null);
      return;
    }

    if (editingProduct?.id === product.id) {
      cancelEditing();
    }

    setProducts((current) => current.filter((item) => item.id !== product.id));
    setFeedback("Produto excluido.");
    setIsDeleting(null);
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold text-cyan-300">
            Produtos e estoque
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Produtos organizados para vender sem perder controle
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Cadastre SKU, categoria, preço, loja, estoque atual e estoque
            mínimo para enxergar o que precisa de reposição antes de faltar.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-4 xl:w-[560px]">
          {(["all", "healthy", "low", "out"] as StockFilter[]).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStockFilter(status)}
              className={`rounded-lg border px-3 py-3 text-left transition ${
                stockFilter === status
                  ? "border-cyan-300 bg-cyan-300 text-slate-950"
                  : "border-white/10 bg-black/20 text-slate-300 hover:bg-white/[0.06]"
              }`}
            >
              <span className="block text-xs font-semibold">
                {statusLabel(status)}
              </span>
              <span className="mt-1 block text-lg font-semibold">
                {totals[status]}
              </span>
            </button>
          ))}
        </div>
      </section>

      {!isLoading && stores.length === 0 && (
        <section className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-5 shadow-xl shadow-black/10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-amber-100">
                Cadastre uma loja antes de adicionar produtos
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-50/80">
                Cada produto precisa pertencer a uma unidade. Isso permite
                acompanhar matriz, filial ou estoque central sem misturar dados.
              </p>
            </div>
            <Link
              href="/app/stores"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-amber-200 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-100"
            >
              Criar loja
              <Plus size={17} />
            </Link>
          </div>
        </section>
      )}

      <section className="grid gap-6 2xl:grid-cols-[390px_1fr]">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="h-fit rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {editingProduct ? "Editar produto" : "Novo produto"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Use um codigo unico para localizar itens rapidamente.
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
                placeholder="Filtro de oleo, arroz 5kg, camiseta preta"
              />
            </Field>

              <Field label="SKU / código interno" error={errors.code?.message}>
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

              <Field label="Estoque atual" error={errors.quantity?.message}>
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
              <Field label="Estoque mínimo" error={errors.minStock?.message}>
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
                  placeholder="Pecas, bebidas, roupas"
                />
              </Field>
            </div>

            <Field label="Loja ou unidade" error={errors.storeId?.message}>
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
            <p className="mt-5 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-300">
              {feedback}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {editingProduct ? "Salvar" : "Cadastrar"}
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
          <div className="space-y-4 border-b border-white/10 p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Lista de produtos
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {filteredProducts.length} produto(s) encontrado(s) para
                  compra, venda e reposição
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadData()}
                className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-lg border border-white/10 px-3 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06]"
              >
                <RefreshCcw size={17} />
                Atualizar
              </button>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
              <label className="flex h-11 items-center gap-3 rounded-lg border border-white/10 bg-black/20 px-3 text-slate-500">
                <Search size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por nome, SKU, categoria ou loja"
                  className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                />
              </label>

              <select
                value={storeFilter}
                onChange={(event) => setStoreFilter(event.target.value)}
                className="form-input"
              >
                <option value="all">Todas as lojas</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>

              <select
                value={stockFilter}
                onChange={(event) => setStockFilter(event.target.value as StockFilter)}
                className="form-input"
              >
                <option value="all">Todos os status</option>
                <option value="healthy">Em dia</option>
                <option value="low">Baixo estoque</option>
                <option value="out">Em falta</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left">
              <thead className="text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Produto</th>
                  <th className="px-5 py-4 font-semibold">SKU</th>
                  <th className="px-5 py-4 font-semibold">Preco</th>
                  <th className="px-5 py-4 font-semibold">Estoque</th>
                  <th className="px-5 py-4 font-semibold">Min.</th>
                  <th className="px-5 py-4 font-semibold">Categoria</th>
                  <th className="px-5 py-4 font-semibold">Loja</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-5 py-12 text-center text-sm text-slate-500"
                    >
                      Carregando produtos...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-5 py-12 text-center"
                    >
                      <div className="mx-auto max-w-md">
                        <PackagePlus
                          className="mx-auto text-cyan-300"
                          size={28}
                        />
                        <h3 className="mt-4 text-base font-semibold text-white">
                          {products.length === 0
                            ? "Você ainda não cadastrou produtos"
                            : "Nenhum produto encontrado com estes filtros"}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {products.length === 0
                            ? "Comece adicionando seus itens mais vendidos para acompanhar estoque, valor parado e alertas em tempo real."
                            : "Ajuste a busca, a loja ou o status para encontrar outros itens do estoque."}
                        </p>
                        {products.length === 0 && (
                          <p className="mt-3 text-sm font-semibold text-cyan-200">
                            Preencha o formulario ao lado para cadastrar o
                            primeiro produto.
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const status = productStatus(product);
                    const isProblem = status !== "healthy";

                    return (
                      <tr key={product.id} className="text-sm">
                        <td className="px-5 py-4 font-medium text-white">
                          {product.name}
                        </td>
                        <td className="px-5 py-4 font-mono text-slate-400">
                          {product.code}
                        </td>
                        <td className="px-5 py-4 text-slate-300">
                          {currency.format(product.price)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-md px-2 py-1 text-xs font-semibold ${
                              isProblem
                                ? "bg-amber-400/10 text-amber-200"
                                : "bg-emerald-400/10 text-emerald-200"
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
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
                              status === "out"
                                ? "bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/20"
                                : status === "low"
                                  ? "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/20"
                                  : "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/20"
                            }`}
                          >
                            {isProblem && <AlertTriangle size={13} />}
                            {statusLabel(status)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEditing(product)}
                              aria-label={`Editar ${product.name}`}
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:bg-white/[0.06] hover:text-cyan-200"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteProduct(product)}
                              disabled={isDeleting === product.id}
                              aria-label={`Excluir ${product.name}`}
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:bg-rose-400/10 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
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
