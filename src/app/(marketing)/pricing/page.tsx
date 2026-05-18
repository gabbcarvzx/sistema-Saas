import Link from "next/link";
import { ArrowRight, CheckCircle2, CreditCard, ShieldCheck } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "R$39",
    description: "Para pequenos negócios que querem sair da planilha.",
    benefits: [
      "Produtos e lojas",
      "Alertas de estoque mínimo",
      "Dashboard operacional",
      "Teste gratuito para validar o uso",
    ],
  },
  {
    name: "Pro",
    price: "R$79",
    description: "Para negócios que precisam controlar rotina e reposição.",
    featured: true,
    benefits: [
      "Tudo do Starter",
      "Mais volume de produtos",
      "Filtros por loja e status",
      "Pagamento mensal via Mercado Pago",
    ],
  },
  {
    name: "Business",
    price: "R$149",
    description: "Para operações com mais lojas, volume e controle gerencial.",
    benefits: [
      "Tudo do Pro",
      "Operação multi-unidade",
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
              Começar grátis
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-[#f7faf8] px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
            Planos e preços
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Escolha o plano para controlar estoque com previsibilidade
          </h1>
          <p className="mt-4 text-lg leading-7 text-slate-600">
            Comece no teste gratuito, cadastre lojas e produtos, acompanhe
            alertas e assine quando o StockPro entrar na rotina do negócio.
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
                Começar teste grátis
                <ArrowRight size={17} />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#f7faf8] px-4 pb-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2">
          <article className="rounded-lg border border-slate-200 bg-white p-5">
            <CreditCard className="text-cyan-700" size={24} />
            <h2 className="mt-4 font-semibold text-slate-950">
              Pagamento mensal simples
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              O checkout usa Mercado Pago. Após a aprovação, o acesso fica
              liberado por 30 dias e pode ser renovado pela página de
              assinatura. Não há cobrança recorrente automática nesta versão.
            </p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-5">
            <ShieldCheck className="text-emerald-700" size={24} />
            <h2 className="mt-4 font-semibold text-slate-950">
              Produto preparado para clientes reais
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Cada empresa opera em seu proprio tenant, com dados de produtos,
              lojas e assinatura isolados por sessão.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
