"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Building2, CheckCircle2 } from "lucide-react";

type ApiError = {
  message?: string;
  errors?: Record<string, string[]>;
};

export default function SignupPage() {
  const [companyName, setCompanyName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#22d3ee");
  const [supportEmail, setSupportEmail] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    const response = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName,
        tenantSlug,
        adminName,
        adminEmail,
        password,
        primaryColor,
        supportEmail: supportEmail || undefined,
      }),
    });

    if (response.status === 303 || response.ok) {
      window.location.href = `/login?tenant=${encodeURIComponent(tenantSlug)}`;
      return;
    }

    const body = (await response.json().catch(() => ({}))) as ApiError;
    const firstFieldError = Object.values(body.errors ?? {})[0]?.[0];
    setFeedback(firstFieldError ?? body.message ?? "Nao foi possivel criar a conta.");
    setIsSubmitting(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0f172a] px-4 py-8 text-slate-100">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-2xl rounded-lg border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
          <Building2 size={24} />
        </div>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white">
          Criar empresa
        </h1>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-300">Empresa</span>
            <input
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              className="form-input mt-2"
              placeholder="Oficina Central"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Slug</span>
            <input
              value={tenantSlug}
              onChange={(event) => setTenantSlug(event.target.value)}
              className="form-input mt-2"
              placeholder="oficina-central"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Admin</span>
            <input
              value={adminName}
              onChange={(event) => setAdminName(event.target.value)}
              className="form-input mt-2"
              placeholder="Maria Silva"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Email admin</span>
            <input
              value={adminEmail}
              onChange={(event) => setAdminEmail(event.target.value)}
              className="form-input mt-2"
              placeholder="maria@empresa.com"
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

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Cor primaria</span>
            <input
              value={primaryColor}
              onChange={(event) => setPrimaryColor(event.target.value)}
              className="form-input mt-2"
              type="color"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-300">Email suporte</span>
            <input
              value={supportEmail}
              onChange={(event) => setSupportEmail(event.target.value)}
              className="form-input mt-2"
              placeholder="suporte@empresa.com"
              type="email"
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
          <CheckCircle2 size={18} />
          {isSubmitting ? "Criando..." : "Iniciar trial"}
        </button>

        <p className="mt-5 text-center text-sm text-slate-400">
          Ja tem conta?{" "}
          <Link className="font-semibold text-cyan-300" href="/login">
            Entrar
          </Link>
        </p>
      </form>
    </main>
  );
}
