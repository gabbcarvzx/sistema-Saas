import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  CreditCard,
  PackageSearch,
  ShieldCheck,
  Store,
  Wrench,
} from "lucide-react";

const niches = [
  "Oficinas mecanicas",
  "Autopecas",
  "Mercadinhos",
  "Lojas de roupas",
  "Distribuidoras",
  "Assistencia tecnica",
];

const features = [
  {
    title: "Estoque minimo e alertas",
    text: "Veja o que esta acabando antes de perder venda ou atrasar atendimento.",
    icon: AlertTriangle,
  },
  {
    title: "Produtos por loja",
    text: "Separe matriz, filial, estoque central ou unidade de servico.",
    icon: Store,
  },
  {
    title: "Assinatura recorrente",
    text: "Trial, checkout e status comercial preparados para SaaS real.",
    icon: CreditCard,
  },
  {
    title: "Isolamento por cliente",
    text: "Arquitetura multi-tenant com tenantId nas entidades de negocio.",
    icon: ShieldCheck,
  },
];

const plans = [
  ["Starter", "R$39", "Controle simples para comecar"],
  ["Pro", "R$79", "Mais escolhido para pequenos negocios"],
  ["Business", "R$149", "Mais lojas e operacao em crescimento"],
];

const faq = [
  [
    "Preciso instalar alguma coisa?",
    "Nao. O StockPro roda no navegador e pode ser usado em computador, tablet ou celular.",
  ],
  [
    "Serve so para oficina?",
    "Nao. A estrutura funciona para oficina, autopecas, mercado, loja, distribuidora e estoque geral.",
  ],
  [
    "O teste gratis bloqueia meus dados?",
    "O trial libera a operacao. Depois, o tenant pode assinar para continuar usando comercialmente.",
  ],
];

export default function MarketingHomePage() {
  return (
    <main>
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500 text-white">
              <Boxes size={22} />
            </span>
            <span className="text-lg font-semibold text-slate-950">StockPro</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="#nichos" className="transition hover:text-slate-950">
              Nichos
            </a>
            <a href="#funcionalidades" className="transition hover:text-slate-950">
              Funcionalidades
            </a>
            <Link href="/pricing" className="transition hover:text-slate-950">
              Planos
            </Link>
            <Link href="/login" className="transition hover:text-slate-950">
              Entrar
            </Link>
          </nav>

          <Link
            href="/signup"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Comecar gratis
            <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8 lg:py-16">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Sistema de estoque para pequenos negocios
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Pare de perder dinheiro por falta de controle de estoque
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              O StockPro ajuda negocios locais a saber o que tem, o que acabou,
              o que precisa comprar e qual loja precisa de reposicao. Simples
              para operar, pronto para vender como SaaS recorrente.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-cyan-500 px-5 text-sm font-semibold text-white transition hover:bg-cyan-600"
              >
                Comecar teste gratis
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Ver planos
              </Link>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {["Trial rapido", "Checkout recorrente", "Multi-tenant"].map(
                (item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    {item}
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-[#101418] p-4 shadow-2xl shadow-slate-300/40">
            <div className="rounded-lg border border-white/10 bg-white/[0.04]">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
                <div>
                  <p className="text-sm font-semibold text-white">
                    Dashboard StockPro
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Autopecas Centro · TRIAL
                  </p>
                </div>
                <span className="rounded-lg bg-cyan-300 px-3 py-1.5 text-xs font-semibold text-slate-950">
                  12 dias restantes
                </span>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {[
                  ["Produtos", "1.248", "text-cyan-200"],
                  ["Em falta", "23", "text-rose-200"],
                  ["Baixo estoque", "67", "text-amber-200"],
                  ["Lojas", "4", "text-emerald-200"],
                ].map(([label, value, tone]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
                  >
                    <p className="text-sm text-slate-400">{label}</p>
                    <p className={`mt-3 text-3xl font-semibold ${tone}`}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/10 p-4">
                {[
                  ["Pastilha de freio", "Centro", "8", "Baixo estoque"],
                  ["Cabo USB-C", "Assistencia", "0", "Em falta"],
                  ["Arroz 5kg", "Mercado", "42", "Em dia"],
                ].map(([product, store, quantity, status]) => (
                  <div
                    key={product}
                    className="grid grid-cols-[1.2fr_0.8fr_0.4fr_0.8fr] gap-3 border-b border-white/10 py-3 text-sm last:border-0"
                  >
                    <span className="font-semibold text-white">{product}</span>
                    <span className="text-slate-400">{store}</span>
                    <span className="text-slate-300">{quantity}</span>
                    <span className="text-slate-300">{status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f7faf8] py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold text-rose-700">O problema</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Estoque sem processo vira dinheiro parado ou venda perdida
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                "Produto acaba e ninguem percebe",
                "Compra duplicada porque nao ha visao por loja",
                "Dono decide no chute e perde margem",
              ].map((item) => (
                <div key={item} className="rounded-lg border border-slate-200 bg-white p-5">
                  <AlertTriangle className="text-rose-600" size={22} />
                  <p className="mt-4 text-sm font-semibold leading-6 text-slate-800">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="nichos" className="bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold text-cyan-700">
                Multi-nicho
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Feito para negocios locais que precisam girar estoque
              </h2>
            </div>
            <Wrench className="hidden text-cyan-600 md:block" size={34} />
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {niches.map((niche) => (
              <div
                key={niche}
                className="rounded-lg border border-slate-200 bg-[#f7faf8] p-5"
              >
                <PackageSearch className="text-cyan-700" size={22} />
                <h3 className="mt-4 font-semibold text-slate-950">{niche}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Produtos, lojas, minimo, alertas e reposicao no mesmo fluxo.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="funcionalidades" className="bg-[#101418] py-14 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-cyan-300">
              Solucao completa para MVP comercial
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              Controle operacional com base SaaS pronta para cobrar
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-5"
              >
                <feature.icon className="text-cyan-300" size={23} />
                <h3 className="mt-4 font-semibold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {feature.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold text-cyan-700">
                Planos simples
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Comece barato e evolua com o cliente
              </h2>
            </div>
            <Link
              href="/pricing"
              className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Ver detalhes
              <ArrowRight size={17} />
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {plans.map(([name, price, text]) => (
              <article
                key={name}
                className="rounded-lg border border-slate-200 bg-[#f7faf8] p-5"
              >
                <h3 className="font-semibold text-slate-950">{name}</h3>
                <p className="mt-4 text-3xl font-semibold text-slate-950">
                  {price}
                  <span className="text-sm font-medium text-slate-500">/mes</span>
                </p>
                <p className="mt-3 text-sm text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f7faf8] py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <BarChart3 className="mx-auto text-cyan-700" size={34} />
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
              Comece o trial e venda melhor seu proprio negocio
            </h2>
            <p className="mt-3 text-slate-600">
              Em poucos minutos o cliente cria a empresa, entra no dashboard,
              cadastra produtos e pode assinar.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-cyan-500 px-5 text-sm font-semibold text-white transition hover:bg-cyan-600"
              >
                Comecar teste gratis
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 text-sm font-semibold text-slate-800 transition hover:bg-white"
              >
                Assinar agora
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
            Perguntas frequentes
          </h2>
          <div className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-200">
            {faq.map(([question, answer]) => (
              <div key={question} className="p-5">
                <h3 className="font-semibold text-slate-950">{question}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
