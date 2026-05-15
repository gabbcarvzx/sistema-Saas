import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "R$39",
    description: "Para pequenos negocios que querem sair da planilha.",
    benefits: [
      "Produtos e lojas",
      "Alertas de estoque minimo",
      "Dashboard operacional",
      "Trial para validar o uso",
    ],
  },
  {
    name: "Pro",
    price: "R$79",
    description: "Para negocios que precisam controlar rotina e reposicao.",
    featured: true,
    benefits: [
      "Tudo do Starter",
      "Mais volume de produtos",
      "Filtros por loja e status",
      "Fluxo de assinatura recorrente",
    ],
  },
  {
    name: "Business",
    price: "R$149",
    description: "Para operacoes com mais lojas, volume e controle gerencial.",
    benefits: [
      "Tudo do Pro",
      "Operacao multi-unidade",
      "Base preparada para escala",
      "Prioridade comercial",
    ],
  },
];

export default function PricingPage() {
  return (
    <main>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-lg font-semibold text-slate-950">
            StockPro
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-sm font-semibold text-slate-600 transition hover:text-slate-950 sm:inline"
            >
              Entrar
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Comecar gratis
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-[#f7faf8] px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
            Planos e precos
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Escolha o plano para transformar estoque em rotina previsivel
          </h1>
          <p className="mt-4 text-lg leading-7 text-slate-600">
            Comece no trial, valide com o cliente e ative a assinatura quando o
            sistema virar parte da operacao.
          </p>
        </div>
      </section>

      <section className="bg-white px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`rounded-lg border p-6 shadow-xl shadow-slate-200/50 ${
                plan.featured
                  ? "border-cyan-500 bg-cyan-500 text-white"
                  : "border-slate-200 bg-white text-slate-950"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">{plan.name}</h2>
                {plan.featured && (
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-cyan-700">
                    Mais escolhido
                  </span>
                )}
              </div>
              <p
                className={`mt-3 text-sm leading-6 ${
                  plan.featured ? "text-cyan-50" : "text-slate-600"
                }`}
              >
                {plan.description}
              </p>
              <p className="mt-6 text-4xl font-semibold">
                {plan.price}
                <span
                  className={`text-sm font-medium ${
                    plan.featured ? "text-cyan-50" : "text-slate-500"
                  }`}
                >
                  /mes
                </span>
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {plan.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2">
                    <CheckCircle2
                      size={17}
                      className={plan.featured ? "text-white" : "text-emerald-600"}
                    />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`mt-7 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${
                  plan.featured
                    ? "bg-white text-cyan-700 hover:bg-cyan-50"
                    : "bg-slate-950 text-white hover:bg-slate-800"
                }`}
              >
                Comecar teste gratis
                <ArrowRight size={17} />
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
