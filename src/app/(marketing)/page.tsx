import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  CreditCard,
  LockKeyhole,
  PackagePlus,
  ShieldCheck,
  Store,
} from "lucide-react";

const metrics = [
  { label: "Produtos monitorados", value: "12.480", tone: "text-cyan-300" },
  { label: "Alertas de reposicao", value: "184", tone: "text-amber-300" },
  { label: "Lojas conectadas", value: "36", tone: "text-emerald-300" },
];

const pillars = [
  {
    title: "Multi-tenant desde a base",
    description:
      "Cada cliente opera em contexto isolado, com tenantId aplicado nas entidades e consultas de negocio.",
    icon: ShieldCheck,
    tone: "text-cyan-300",
    bg: "bg-cyan-400/10",
  },
  {
    title: "Billing recorrente",
    description:
      "Trial, assinatura ativa e bloqueio comercial trabalham junto ao acesso do app.",
    icon: CreditCard,
    tone: "text-emerald-300",
    bg: "bg-emerald-400/10",
  },
  {
    title: "Operacao pronta para escala",
    description:
      "Fluxo preparado para dominio raiz, subdominios futuros e operacao em Vercel.",
    icon: LockKeyhole,
    tone: "text-amber-300",
    bg: "bg-amber-400/10",
  },
];

export default function MarketingHomePage() {
  return (
    <main>
      <header className="border-b border-white/10 bg-[#07111f]/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400 text-slate-950">
              <Boxes size={22} />
            </span>
            <span className="text-lg font-semibold text-white">StockPro</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-300 md:flex">
            <a href="#plataforma" className="transition hover:text-white">
              Plataforma
            </a>
            <a href="#seguranca" className="transition hover:text-white">
              Seguranca
            </a>
            <Link href="/signup" className="transition hover:text-white">
              Criar empresa
            </Link>
          </nav>

          <Link
            href="/app"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 px-3 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.06]"
          >
            Entrar
            <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      <section className="border-b border-white/10 bg-[#07111f]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase text-cyan-300">
              SaaS de estoque para oficinas e operacoes locais
            </p>
            <h1 className="mt-5 text-4xl font-semibold text-white sm:text-5xl lg:text-6xl">
              StockPro
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Controle produtos, lojas, alertas de reposicao e acesso comercial
              em uma arquitetura SaaS preparada para vender assinaturas.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/app"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Abrir app
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/10 px-5 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.06]"
              >
                Criar empresa
              </Link>
            </div>
          </div>

          <div className="mt-12 overflow-hidden rounded-lg border border-white/10 bg-slate-950 shadow-2xl shadow-black/30">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-white">
                  Painel operacional
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Oficina Demo · trial ativo
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-300">
                <CheckCircle2 size={15} />
                ACTIVE
              </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
              <aside className="hidden border-r border-white/10 bg-[#0b1424] p-5 lg:block">
                {[
                  { label: "Dashboard", icon: BarChart3, active: true },
                  { label: "Produtos", icon: PackagePlus, active: false },
                  { label: "Produtos em falta", icon: AlertTriangle, active: false },
                  { label: "Lojas", icon: Store, active: false },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`mt-2 flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium ${
                      item.active
                        ? "bg-cyan-400 text-slate-950"
                        : "text-slate-400"
                    }`}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </div>
                ))}
              </aside>

              <div className="p-5 sm:p-6">
                <div className="grid gap-4 md:grid-cols-3">
                  {metrics.map((metric) => (
                    <article
                      key={metric.label}
                      className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
                    >
                      <p className="text-sm text-slate-400">{metric.label}</p>
                      <p className={`mt-3 text-2xl font-semibold ${metric.tone}`}>
                        {metric.value}
                      </p>
                    </article>
                  ))}
                </div>

                <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.04]">
                  <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase text-slate-500">
                    <span>Produto</span>
                    <span>Loja</span>
                    <span>Qtd.</span>
                    <span>Status</span>
                  </div>
                  {[
                    ["Filtro de oleo", "Centro", "42", "Em dia"],
                    ["Pastilha de freio", "Zona Sul", "8", "Atencao"],
                    ["Correia dentada", "Centro", "0", "Reposicao"],
                  ].map(([name, store, quantity, status]) => (
                    <div
                      key={name}
                      className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] px-4 py-4 text-sm text-slate-300"
                    >
                      <span className="font-medium text-white">{name}</span>
                      <span>{store}</span>
                      <span>{quantity}</span>
                      <span>{status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="plataforma" className="bg-[#0b1424] py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {pillars.map((pillar) => (
              <article
                key={pillar.title}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-5"
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-lg ${pillar.bg} ${pillar.tone}`}
                >
                  <pillar.icon size={21} />
                </div>
                <h2 className="mt-5 text-lg font-semibold text-white">
                  {pillar.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {pillar.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="seguranca" className="border-t border-white/10 bg-[#07111f] py-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="text-sm font-semibold text-cyan-300">
              Produto pronto para operacao comercial
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Marketing publico separado da area protegida.
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/app"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-cyan-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Entrar no app
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-white/10 px-4 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.06]"
            >
              Criar tenant
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
