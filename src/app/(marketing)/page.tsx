import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  PackageSearch,
  ShieldCheck,
  Store,
  TimerReset,
} from "lucide-react";

const benefits = [
  {
    title: "Menos perda por ruptura",
    text: "Veja produtos zerados ou abaixo do mínimo antes que isso vire venda perdida.",
    icon: AlertTriangle,
  },
  {
    title: "Controle por loja",
    text: "Organize matriz, filial, estoque central ou unidade de atendimento no mesmo painel.",
    icon: Store,
  },
  {
    title: "Rotina simples",
    text: "Cadastro rápido de produtos, filtros e alertas para quem precisa operar sem complicação.",
    icon: TimerReset,
  },
  {
    title: "Dados separados por cliente",
    text: "Arquitetura multi-tenant para manter cada empresa em seu próprio espaço.",
    icon: ShieldCheck,
  },
];

const steps = [
  ["1", "Crie sua empresa", "O cliente entra, cria a conta e inicia em teste gratuito."],
  ["2", "Cadastre lojas", "Separe unidades físicas, filiais ou estoque central."],
  ["3", "Inclua produtos", "Defina SKU, preço, quantidade atual e estoque mínimo."],
  ["4", "Acompanhe alertas", "Use o dashboard para decidir reposição com mais segurança."],
];

const niches = [
  "Oficinas mecânicas",
  "Autopeças",
  "Mercadinhos",
  "Lojas de roupas",
  "Distribuidoras",
  "Assistências técnicas",
];

const plans = [
  ["Starter", "R$39", "Para negócios pequenos que querem sair da planilha."],
  ["Pro", "R$79", "Para quem precisa de rotina, alertas e várias unidades."],
  ["Business", "R$149", "Para operações em crescimento com mais volume."],
];

const examples = [
  {
    title: "Loja de peças",
    text:
      "O dono acompanha itens zerados e baixo estoque antes de fazer a próxima compra.",
  },
  {
    title: "Mercadinho",
    text:
      "A equipe separa produtos por unidade e identifica reposição sem depender de planilhas soltas.",
  },
];

const faqs = [
  [
    "Preciso instalar alguma coisa?",
    "Não. O StockPro roda no navegador e pode ser usado em computador, tablet ou celular.",
  ],
  [
    "Serve somente para oficina?",
    "Não. A estrutura atende qualquer pequeno negócio que precisa controlar produtos, lojas e reposição.",
  ],
  [
    "Como funciona o pagamento?",
    "O pagamento é mensal via Mercado Pago Checkout Pro. Após aprovação, o acesso é liberado por 30 dias.",
  ],
];

export default function MarketingHomePage() {
  return (
    <main className="bg-white text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/92 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-600 text-white">
              <Boxes size={22} />
            </span>
            <span className="text-lg font-semibold">StockPro</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="#beneficios" className="transition hover:text-slate-950">
              Benefícios
            </a>
            <a href="#como-funciona" className="transition hover:text-slate-950">
              Como funciona
            </a>
            <a href="#nichos" className="transition hover:text-slate-950">
              Nichos
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
            Começar grátis
            <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      <section
        className="relative flex min-h-[82vh] items-end bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1800&q=80')",
        }}
      >
        <div className="absolute inset-0 bg-slate-950/70" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-14 pt-24 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
              Sistema de estoque para pequenos negócios
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              StockPro organiza produtos, lojas e reposição em poucos minutos
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
              Pare de perder dinheiro por falta de controle de estoque. Veja o
              que acabou, o que está acabando e onde cada produto precisa de
              atenção.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                Começar teste grátis
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/30 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Ver planos
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              {["Teste gratuito", "Pagamento mensal", "Multi-tenant seguro"].map(
                (item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white backdrop-blur"
                  >
                    <CheckCircle2 size={16} className="text-emerald-300" />
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="beneficios" className="bg-[#f6f8f7] py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-sm font-semibold text-cyan-700">
                Problema que o StockPro resolve
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                Estoque sem processo vira compra errada, produto parado e venda
                perdida
              </h2>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                A plataforma deixa a operação mais visível para donos e equipes
                que precisam de praticidade, sem implantar um ERP complexo.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <article
                  key={benefit.title}
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/40"
                >
                  <benefit.icon className="text-cyan-700" size={23} />
                  <h3 className="mt-4 font-semibold">{benefit.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {benefit.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold text-cyan-700">
                Como funciona
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                Um fluxo simples para transformar estoque em rotina
              </h2>
            </div>
            <ClipboardCheck className="hidden text-emerald-600 md:block" size={34} />
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {steps.map(([number, title, text]) => (
              <article
                key={title}
                className="rounded-lg border border-slate-200 bg-[#f6f8f7] p-5"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-sm font-semibold text-white">
                  {number}
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="nichos" className="bg-[#101418] py-14 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-cyan-300">
              Para quem é
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              Pequenos negócios que precisam saber o que tem, onde está e
              quando comprar
            </h2>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {niches.map((niche) => (
              <div
                key={niche}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-5"
              >
                <PackageSearch className="text-cyan-300" size={22} />
                <h3 className="mt-4 font-semibold">{niche}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Produtos, lojas, mínimo, alertas e assinatura no mesmo fluxo.
                </p>
              </div>
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
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                Comece pequeno e evolua conforme a operação cresce
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
                className="rounded-lg border border-slate-200 bg-[#f6f8f7] p-5"
              >
                <h3 className="font-semibold">{name}</h3>
                <p className="mt-4 text-3xl font-semibold">
                  {price}
                  <span className="text-sm font-medium text-slate-500">/mes</span>
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f6f8f7] py-14">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          {examples.map((example) => (
            <article
              key={example.title}
              className="rounded-lg border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Cenário de uso
              </p>
              <h3 className="mt-4 text-lg font-semibold leading-8">
                {example.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {example.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <BarChart3 className="mx-auto text-cyan-700" size={34} />
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            Organize seu estoque antes da próxima compra
          </h2>
          <p className="mt-3 text-slate-600">
            Comece no teste gratuito, cadastre lojas e produtos, veja os alertas
            e assine quando o StockPro virar parte da rotina.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-5 text-sm font-semibold text-white transition hover:bg-cyan-700"
            >
              Começar teste grátis
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Comparar planos
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#f6f8f7] py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight">
            Perguntas frequentes
          </h2>
          <div className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {faqs.map(([question, answer]) => (
              <div key={question} className="p-5">
                <h3 className="font-semibold">{question}</h3>
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
