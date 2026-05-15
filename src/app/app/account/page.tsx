import Link from "next/link";
import { CalendarClock, CreditCard, LogOut, ShieldCheck, UserCircle } from "lucide-react";
import { getAppContext } from "@/lib/app-context";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null | undefined) {
  return date
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date)
    : "Nao informado";
}

export default async function AccountPage() {
  const { tenant, user } = await getAppContext();
  const subscription = tenant.subscription;

  const items = [
    ["Empresa", tenant.name],
    ["Slug", tenant.slug],
    ["Email de suporte", tenant.supportEmail ?? "Nao informado"],
    ["Usuario", user.name],
    ["Email do usuario", user.email],
    ["Role", user.role],
    ["Status da assinatura", subscription?.status ?? "MISSING"],
    ["Fim do trial", formatDate(subscription?.trialEndsAt)],
    ["Fim do periodo atual", formatDate(subscription?.currentPeriodEnd)],
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
        <p className="text-sm font-semibold text-cyan-300">
          Conta e tenant
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Dados da empresa e do usuario logado
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Esta tela mostra apenas informacoes resolvidas pela sessao atual,
          sem confiar em query publica para acesso a dados sensiveis.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <article className="rounded-lg border border-white/10 bg-white/[0.04] shadow-xl shadow-black/10">
          <div className="flex items-center gap-3 border-b border-white/10 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
              <UserCircle size={21} />
            </div>
            <div>
              <h2 className="font-semibold text-white">Resumo da conta</h2>
              <p className="mt-1 text-sm text-slate-500">
                Identidade operacional do tenant.
              </p>
            </div>
          </div>

          <dl className="divide-y divide-white/10">
            {items.map(([label, value]) => (
              <div
                key={label}
                className="grid gap-2 px-5 py-4 sm:grid-cols-[220px_1fr]"
              >
                <dt className="text-sm font-medium text-slate-500">{label}</dt>
                <dd className="break-words text-sm font-semibold text-slate-100">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </article>

        <aside className="space-y-4">
          <article className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
              <ShieldCheck size={22} />
            </div>
            <h2 className="mt-4 font-semibold text-white">
              Isolamento multi-tenant
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Seus dados sao filtrados por tenantId em produtos, lojas, usuarios
              e assinatura.
            </p>
          </article>

          <article className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
              <CalendarClock size={22} />
            </div>
            <h2 className="mt-4 font-semibold text-white">
              Assinatura atual
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Plano {subscription?.plan.name ?? "nao configurado"} com status{" "}
              {subscription?.status ?? "MISSING"}.
            </p>
            <Link
              href="/app/billing"
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
            >
              <CreditCard size={17} />
              Ir para billing
            </Link>
          </article>

          <form action="/api/logout" method="post">
            <button
              type="submit"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-4 text-sm font-semibold text-slate-300 transition hover:bg-rose-400/10 hover:text-rose-200"
            >
              <LogOut size={18} />
              Sair
            </button>
          </form>
        </aside>
      </section>
    </div>
  );
}
