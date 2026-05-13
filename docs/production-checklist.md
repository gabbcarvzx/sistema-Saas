# Checklist final de producao SaaS

## Variaveis de ambiente

- `DATABASE_URL`
- `APP_ROOT_DOMAIN`
- `DEFAULT_TENANT_SLUG`
- `DEFAULT_TENANT_NAME`
- `DEFAULT_TRIAL_DAYS`
- `SUPPORT_EMAIL`
- `INTERNAL_ACCESS_SECRET`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `PASSWORD_HASH_COST`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_PROFESSIONAL`
- `STRIPE_PRICE_ENTERPRISE`
- `BILLING_WEBHOOK_SECRET`

## Ordem de deploy

1. Configurar variaveis de ambiente.
2. Rodar `npm ci`.
3. Rodar `npm run db:generate`.
4. Rodar `npm run db:migrate`.
5. Rodar `npm run db:seed`.
6. Rodar `npm run typecheck`.
7. Rodar `npm run test`.
8. Rodar `npm run lint`.
9. Rodar `npm run build`.
10. Publicar a aplicacao.

## Migracoes necessarias

- `20260513133000_saas_multi_tenant`
- `20260513170000_commercial_saas_foundation`
- `20260513190000_stripe_plan_codes`

## DNS wildcard

- Criar registro DNS `*.seudominio.com`.
- Em Vercel: adicionar `seudominio.com` e `*.seudominio.com` ao projeto.
- Em VPS: apontar wildcard para o load balancer/Nginx e encaminhar para o Next.
- Configurar `APP_ROOT_DOMAIN=seudominio.com`.

## Stripe

- Criar produtos e precos recorrentes no Stripe.
- Configurar `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PROFESSIONAL` e `STRIPE_PRICE_ENTERPRISE`.
- Configurar endpoint webhook `/api/billing/webhook/stripe`.
- Habilitar eventos:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

## Testes obrigatorios

- Criar tenant por `/signup`.
- Entrar por `/login`.
- Acessar `/dashboard` autenticado.
- Confirmar que `/api/stores` retorna apenas lojas do tenant.
- Testar acesso sem cookie e confirmar redirecionamento para `/login`.
- Testar checkout Stripe.
- Testar webhook Stripe com assinatura valida.
- Testar assinatura vencida/bloqueada e confirmar bloqueio.

## Observabilidade

- Coletar logs JSON em Logtail, Datadog, Axiom ou similar.
- Criar alerta para:
  - `api.request.failed`
  - `billing.subscription.blocked`
  - `billing.payment.failed`
  - `prisma.error`

## Seguranca

- Usar HTTPS obrigatorio.
- Usar cookies HTTP-only com `secure=true` em producao.
- Manter `JWT_SECRET` com pelo menos 32 caracteres.
- Nunca compartilhar `INTERNAL_ACCESS_SECRET`.
- Revisar `npm audit` antes de cada release.

## Smoke test pos deploy

- `GET /login`
- `GET /signup`
- `POST /api/signup`
- `POST /api/login`
- `GET /dashboard` com cookie autenticado
- `GET /api/stores` com cookie autenticado
- `POST /api/billing/checkout`
- `POST /api/billing/webhook/stripe`
