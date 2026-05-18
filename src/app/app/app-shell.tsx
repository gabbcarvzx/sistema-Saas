"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  BarChart3,
  BookOpenCheck,
  Building2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Package,
  Store,
  UserCircle,
} from "lucide-react";

type AppShellProps = {
  children: ReactNode;
  tenant: {
    name: string;
    slug: string;
    subscriptionStatus: string;
    trialEndsAt: string | null;
  };
  user: {
    name: string;
    email: string;
    role: string;
  };
};

const navItems = [
  {
    label: "Dashboard",
    href: "/app/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Produtos",
    href: "/app/products",
    icon: Package,
  },
  {
    label: "Lojas",
    href: "/app/stores",
    icon: Store,
  },
  {
    label: "Treinamento",
    href: "/app/training",
    icon: BookOpenCheck,
  },
  {
    label: "Conta",
    href: "/app/account",
    icon: UserCircle,
  },
  {
    label: "Assinatura",
    href: "/app/billing",
    icon: CreditCard,
  },
];

function subscriptionLabel(status: string) {
  const labels: Record<string, string> = {
    TRIAL: "Teste gratuito",
    ACTIVE: "Ativo",
    BLOCKED: "Bloqueado",
    CANCELED: "Cancelado",
    MISSING: "Sem assinatura",
  };

  return labels[status] ?? status;
}

function subscriptionTone(status: string) {
  if (status === "ACTIVE") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }

  if (status === "TRIAL") {
    return "border-cyan-400/20 bg-cyan-400/10 text-cyan-200";
  }

  return "border-rose-400/20 bg-rose-400/10 text-rose-200";
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function formatShortDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
        new Date(value),
      )
    : null;
}

export function AppShell({ children, tenant, user }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#101418] text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-white/10 bg-[#0b1117] px-5 py-6 shadow-2xl shadow-black/30 lg:flex lg:flex-col">
        <Link href="/app/dashboard" className="flex items-center gap-3 px-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-950/30">
            <BarChart3 size={23} strokeWidth={2.4} />
          </span>
          <span>
            <span className="block text-lg font-semibold tracking-tight">
              StockPro
            </span>
            <span className="block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Estoque SaaS
            </span>
          </span>
        </Link>

        <div className="mt-7 rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
              <Building2 size={20} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {tenant.name}
              </p>
              <p className="mt-1 truncate font-mono text-xs text-slate-500">
                {tenant.slug}
              </p>
            </div>
          </div>

          <div
            className={`mt-4 inline-flex max-w-full items-center rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${subscriptionTone(
              tenant.subscriptionStatus,
            )}`}
          >
            {subscriptionLabel(tenant.subscriptionStatus)}
          </div>
          {tenant.subscriptionStatus === "TRIAL" && tenant.trialEndsAt && (
            <p className="mt-3 text-xs text-slate-500">
              Teste gratuito até {formatShortDate(tenant.trialEndsAt)}
            </p>
          )}
        </div>

        <nav className="mt-7 space-y-1">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
                  active
                    ? "bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-950/20"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <item.icon size={19} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <form action="/api/logout" method="post" className="mt-auto">
          <div className="mb-3 rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="truncate text-sm font-semibold text-white">
              {user.name}
            </p>
            <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>
            <p className="mt-3 inline-flex rounded-md bg-white/[0.06] px-2 py-1 text-xs font-semibold text-slate-300">
              {user.role === "ADMIN" ? "Administrador" : "Equipe"}
            </p>
          </div>
          <button
            type="submit"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-4 text-sm font-semibold text-slate-300 transition hover:bg-rose-400/10 hover:text-rose-200"
          >
            <LogOut size={18} />
            Sair
          </button>
        </form>
      </aside>

      <main className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[#101418]/92 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                  {tenant.name}
                </p>
                <p className="mt-1 truncate text-sm text-slate-400">
                  Estoque, lojas e assinatura em um painel seguro
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-9 items-center rounded-lg border px-3 text-xs font-semibold ${subscriptionTone(
                    tenant.subscriptionStatus,
                  )}`}
                >
                  {subscriptionLabel(tenant.subscriptionStatus)}
                </span>
                <form action="/api/logout" method="post">
                  <button
                    type="submit"
                    aria-label="Sair"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    <LogOut size={17} />
                  </button>
                </form>
              </div>
            </div>

            <nav className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {navItems.map((item) => {
                const active = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
                      active
                        ? "bg-cyan-300 text-slate-950"
                        : "border border-white/10 text-slate-300"
                    }`}
                  >
                    <item.icon size={17} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
