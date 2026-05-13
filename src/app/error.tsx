"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(
      JSON.stringify({
        level: "error",
        message: "app.render.failed",
        error: {
          name: error.name,
          message: error.message,
          digest: error.digest,
        },
        timestamp: new Date().toISOString(),
      }),
    );
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0f172a] px-4 text-slate-100">
      <section className="w-full max-w-lg rounded-lg border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
          <AlertTriangle size={24} />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white">
          Algo saiu do esperado
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Nao foi possivel carregar esta tela agora.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          <RefreshCcw size={18} />
          Tentar novamente
        </button>
      </section>
    </main>
  );
}
