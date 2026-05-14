"use client";

import { useEffect, useState } from "react";

type Store = {
  id: string;
  name: string;
  location: string | null;
};

export default function LojasPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStores() {
      try {
        const res = await fetch("/api/stores");

        if (!res.ok) {
          throw new Error("Nao foi possivel carregar as lojas.");
        }

        const data = (await res.json()) as Store[];
        setStores(data);
      } catch (error) {
        console.error("Erro ao buscar lojas:", error);
      } finally {
        setLoading(false);
      }
    }

    void fetchStores();
  }, []);

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Lojas</h1>

      {stores.length === 0 ? (
        <p>Nenhuma loja cadastrada.</p>
      ) : (
        <div className="space-y-4">
          {stores.map((store) => (
            <div key={store.id} className="rounded-lg bg-gray-800 p-4">
              <p className="font-semibold">{store.name}</p>
              <p className="text-sm text-gray-400">
                {store.location ?? "Localizacao nao informada"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
