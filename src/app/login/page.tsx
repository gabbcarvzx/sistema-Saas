"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Lock, LogIn } from "lucide-react";

type ApiError = {
  message?: string;
  errors?: Record<string, string[]>;
};

export default function LoginPage() {
  const [tenantSlug, setTenantSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setTenantSlug(new URLSearchParams(window.location.search).get("tenant") ?? "");
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantSlug, email, password }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as ApiError;
      setFeedback(body.message ?? "Nao foi possivel entrar.");
      setIsSubmitting(false);
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0f172a] px-4 text-slate-100">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-lg border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
          <Lock size={24} />
        </div>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white">
          Entrar no StockPro
        </h1>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-300">Cliente</span>
            <input
              value={tenantSlug}
              onChange={(event) => setTenantSlug(event.target.value)}
              className="form-input mt-2"
              placeholder="minha-oficina"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="form-input mt-2"
              placeholder="admin@empresa.com"
              required
              type="email"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Senha</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="form-input mt-2"
              required
              type="password"
            />
          </label>
        </div>

        {feedback && (
          <p className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
            {feedback}
          </p>
        )}

        <button
          disabled={isSubmitting}
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
        >
          <LogIn size={18} />
          {isSubmitting ? "Entrando..." : "Entrar"}
        </button>

        <p className="mt-5 text-center text-sm text-slate-400">
          Ainda nao tem conta?{" "}
          <Link className="font-semibold text-cyan-300" href="/signup">
            Criar empresa
          </Link>
        </p>
      </form>
    </main>
  );
}
