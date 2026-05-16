import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  HelpCircle,
  PackagePlus,
  SearchCheck,
  Store,
} from "lucide-react";

export const dynamic = "force-dynamic";

const steps = [
  {
    title: "Cadastre sua loja",
    text: "Comece pela unidade onde o estoque será controlado: matriz, filial, estoque central ou ponto de venda.",
    href: "/app/stores",
    cta: "Ir para Lojas",
    icon: Store,
  },
  {
    title: "Cadastre seus produtos",
    text: "Informe nome, SKU, preço, quantidade atual, estoque mínimo, categoria e loja responsável.",
    href: "/app/products",
    cta: "Ir para Produtos",
    icon: PackagePlus,
  },
  {
    title: "Acompanhe o estoque",
    text: "Use o dashboard para ver total de produtos, valor parado, baixo estoque e itens em falta.",
    href: "/app/dashboard",
    cta: "Ver Dashboard",
    icon: BarChart3,
  },
  {
    title: "Priorize produtos em falta",
    text: "Consulte a lista de reposição para comprar primeiro o que está zerado ou abaixo do mínimo.",
    href: "/app/produtos-em-falta",
    cta: "Ver alertas",
    icon: SearchCheck,
  },
  {
    title: "Renove a assinatura",
    text: "Quando precisar continuar usando, acesse Assinatura e pague pelo Mercado Pago. Aprovou, libera 30 dias.",
    href: "/app/billing",
    cta: "Ver Assinatura",
    icon: CreditCard,
  },
];

const quickTips = [
  "Use SKU simples e padronizado para encontrar produtos sem confusão.",
  "Defina estoque mínimo realista para receber alertas antes da ruptura.",
  "Cadastre produtos mais vendidos primeiro e evolua o restante aos poucos.",
  "Separe lojas corretamente para saber onde a reposição precisa acontecer.",
];

const faqs = [
  [
    "Preciso cadastrar uma loja antes do produto?",
    "Sim. Cada produto pertence a uma loja ou unidade para manter o estoque organizado por local.",
  ],
  [
    "O que significa estoque mínimo?",
    "É a quantidade limite que dispara alerta. Quando o estoque atual fica igual ou abaixo dela, o item entra na lista de reposição.",
  ],
  [
    "Posso usar para mais de um nicho?",
    "Sim. O StockPro funciona para lojas, oficinas, mercados, assistências, distribuidores e pequenos negócios com estoque.",
  ],
  [
    "Como funciona a renovação?",
    "O pagamento é mensal via Mercado Pago. Depois da aprovação, o acesso fica liberado por 30 dias.",
  ],
];

const checklist = [
  "Criar ou revisar a primeira loja",
  "Cadastrar os produtos mais importantes",
  "Preencher estoque atual e estoque mínimo",
  "Abrir Produtos em falta para validar alertas",
  "Conferir status da assinatura",
];

export default function TrainingPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-cyan-300">
              Treinamento
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Aprenda o fluxo ideal para controlar seu estoque
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Este guia mostra os primeiros passos para organizar lojas,
              cadastrar produtos, acompanhar alertas e manter a assinatura em
              dia sem depender de planilhas.
            </p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-cyan-300 text-slate-950">
            <BookOpenCheck size={28} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Link
          href="/app/stores"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200"
        >
          Ir para Lojas
          <ArrowRight size={17} />
        </Link>
        <Link
          href="/app/products"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
        >
          Ir para Produtos
          <ArrowRight size={17} />
        </Link>
        <Link
          href="/app/dashboard"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/10 px-4 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06]"
        >
          Ir para Dashboard
          <ArrowRight size={17} />
        </Link>
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        {steps.map((step, index) => (
          <article
            key={step.title}
            className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
                <step.icon size={21} />
              </div>
              <span className="rounded-md bg-white/[0.06] px-2 py-1 text-xs font-semibold text-slate-300">
                Passo {index + 1}
              </span>
            </div>
            <h2 className="mt-5 text-base font-semibold text-white">
              {step.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{step.text}</p>
            <Link
              href={step.href}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200"
            >
              {step.cta}
              <ArrowRight size={16} />
            </Link>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <article className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
          <div className="flex items-center gap-3">
            <ClipboardList className="text-emerald-300" size={23} />
            <div>
              <h2 className="text-lg font-semibold text-white">
                Checklist de primeiros passos
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Use como roteiro para deixar o tenant pronto para operar.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {checklist.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/20 p-3"
              >
                <CheckCircle2 className="mt-0.5 text-emerald-300" size={18} />
                <span className="text-sm leading-6 text-slate-300">{item}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
          <h2 className="text-lg font-semibold text-white">Dicas rápidas</h2>
          <div className="mt-5 space-y-3">
            {quickTips.map((tip) => (
              <div
                key={tip}
                className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm leading-6 text-slate-300"
              >
                {tip}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
        <div className="flex items-center gap-3">
          <HelpCircle className="text-cyan-300" size={23} />
          <h2 className="text-lg font-semibold text-white">
            Perguntas frequentes
          </h2>
        </div>
        <div className="mt-5 divide-y divide-white/10 rounded-lg border border-white/10">
          {faqs.map(([question, answer]) => (
            <div key={question} className="p-4">
              <h3 className="text-sm font-semibold text-white">{question}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {answer}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
