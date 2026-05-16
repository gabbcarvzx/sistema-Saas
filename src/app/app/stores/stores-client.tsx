"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  ArrowRight,
  Edit3,
  Loader2,
  MapPin,
  Plus,
  RefreshCcw,
  Save,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  StoreFormData,
  StoreFormInput,
  storeSchema,
} from "@/lib/store-schema";

type StoreRow = {
  id: string;
  name: string;
  location: string | null;
  createdAt: string;
  _count?: {
    products: number;
  };
};

type ApiError = {
  message?: string;
  errors?: Partial<Record<keyof StoreFormData, string[]>>;
};

const emptyStore: StoreFormInput = {
  name: "",
  location: "",
};

export function StoresClient() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [editingStore, setEditingStore] = useState<StoreRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<StoreFormInput, unknown, StoreFormData>({
    resolver: zodResolver(storeSchema),
    defaultValues: emptyStore,
  });

  const loadStores = useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/stores", { cache: "no-store" });

      if (!response.ok) {
        throw new Error("Não foi possível carregar as lojas.");
      }

      setStores((await response.json()) as StoreRow[]);
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as lojas.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStores();
  }, [loadStores]);

  function startEditing(store: StoreRow) {
    setEditingStore(store);
    setFeedback(null);
    reset({
      name: store.name,
      location: store.location ?? "",
    });
  }

  function cancelEditing() {
    setEditingStore(null);
    setFeedback(null);
    reset(emptyStore);
  }

  async function onSubmit(data: StoreFormData) {
    setIsSaving(true);
    setFeedback(null);

    const endpoint = editingStore ? `/api/stores/${editingStore.id}` : "/api/stores";
    const response = await fetch(endpoint, {
      method: editingStore ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = (await response.json().catch(() => ({}))) as ApiError;

    if (!response.ok) {
      if (body.errors) {
        Object.entries(body.errors).forEach(([field, messages]) => {
          if (messages?.[0]) {
            setError(field as keyof StoreFormData, { message: messages[0] });
          }
        });
      }

      setFeedback(body.message ?? "Não foi possível salvar a loja.");
      setIsSaving(false);
      return;
    }

    setFeedback(editingStore ? "Loja atualizada." : "Loja criada.");
    setEditingStore(null);
    reset(emptyStore);
    await loadStores();
    setIsSaving(false);
  }

  async function deleteStore(store: StoreRow) {
    const confirmed = window.confirm(`Deseja excluir a loja "${store.name}"?`);

    if (!confirmed) {
      return;
    }

    setIsDeleting(store.id);
    setFeedback(null);

    const response = await fetch(`/api/stores/${store.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as ApiError;
      setFeedback(body.message ?? "Não foi possível excluir a loja.");
      setIsDeleting(null);
      return;
    }

    if (editingStore?.id === store.id) {
      cancelEditing();
    }

    setStores((current) => current.filter((item) => item.id !== store.id));
    setFeedback("Loja excluida.");
    setIsDeleting(null);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
        <p className="text-sm font-semibold text-emerald-300">
          Unidades e pontos de venda
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Separe seu estoque por loja, filial ou unidade
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Cadastre matriz, filiais, estoque central, assistência técnica ou
          qualquer ponto de venda que precise acompanhar produtos com clareza.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="h-fit rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {editingStore ? "Editar loja" : "Nova loja"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Use nomes simples para facilitar filtros e relatórios.
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
              {editingStore ? <Edit3 size={19} /> : <Plus size={20} />}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <Field label="Nome" error={errors.name?.message}>
              <input
                {...register("name")}
                className="form-input"
                placeholder="Loja Centro"
              />
            </Field>

            <Field label="Localização" error={errors.location?.message}>
              <input
                {...register("location")}
                className="form-input"
                placeholder="Rua, bairro, cidade ou unidade"
              />
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
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {editingStore ? "Salvar" : "Criar loja"}
            </button>

            {editingStore && (
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
              <h2 className="text-lg font-semibold text-white">
                Lojas cadastradas
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {stores.length} loja(s) pronta(s) para organizar produtos
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadStores()}
              className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-lg border border-white/10 px-3 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06]"
            >
              <RefreshCcw size={17} />
              Atualizar
            </button>
          </div>

          <div className="divide-y divide-white/10">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Carregando lojas...
              </div>
            ) : stores.length === 0 ? (
              <div className="p-8 text-center">
                <Store className="mx-auto text-emerald-300" size={30} />
                <h3 className="mt-4 text-base font-semibold text-white">
                  Você ainda não cadastrou lojas
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                  Crie sua primeira unidade para separar produtos por local,
                  entender onde está o estoque e evitar reposição no lugar
                  errado.
                </p>
                <Link
                  href="/app/training"
                  className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 px-4 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06]"
                >
                  Ver treinamento
                  <ArrowRight size={17} />
                </Link>
              </div>
            ) : (
              stores.map((store) => (
                <div
                  key={store.id}
                  className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
                        <Store size={19} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">
                          {store.name}
                        </p>
                        <p className="mt-1 flex items-center gap-1 truncate text-sm text-slate-500">
                          <MapPin size={14} />
                          {store.location ?? "Localização não informada"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold text-slate-300">
                      {store._count?.products ?? 0} produto(s)
                    </span>
                    <button
                      type="button"
                      onClick={() => startEditing(store)}
                      aria-label={`Editar ${store.name}`}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:bg-white/[0.06] hover:text-emerald-200"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteStore(store)}
                      disabled={isDeleting === store.id}
                      aria-label={`Excluir ${store.name}`}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:bg-rose-400/10 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isDeleting === store.id ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
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
