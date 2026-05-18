# StockPro / Sistema SaaS

SaaS multi-tenant para controle de estoque, lojas, produtos em falta e assinatura mensal manual via Mercado Pago Checkout Pro.

## Stack

- Next.js 14 App Router + TypeScript
- Prisma 7 + PostgreSQL/Supabase
- JWT em cookie HTTP-only
- Multi-tenant por `tenantId`
- Billing mensal manual com Mercado Pago Checkout Pro
- Cron diário para bloquear trials e assinaturas vencidas
- Vitest + Playwright

## Setup local

1. Copie `.env.example` para `.env`.
2. Configure `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `INTERNAL_ACCESS_SECRET` e `CRON_SECRET`.
3. Rode:

```bash
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Abra `http://127.0.0.1:3000`.

## Validação antes de deploy

```bash
npm run typecheck
npm run test
npx playwright test
npm run build
```

## Produção

Na Vercel, configure as variáveis do `.env.example`, rode `npm run db:migrate` contra o banco de produção e confirme o cron em `vercel.json`.

Para Mercado Pago, use Checkout Pro com evento `payment` apontando para:

```text
https://app.seudominio.com/api/webhooks/mercadopago
```

O webhook valida `x-signature` e `x-request-id`, registra o evento e só renova a assinatura quando o pagamento retorna aprovado. Pagamento rejeitado não ativa nem bloqueia uma assinatura válida; reembolso/chargeback bloqueia o acesso operacional.

Checklist detalhado: `docs/production-checklist.md`.
