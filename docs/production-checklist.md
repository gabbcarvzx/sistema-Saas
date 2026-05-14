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
- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_WEBHOOK_SECRET`
- `MERCADO_PAGO_WEBHOOK_URL`
- `MERCADO_PAGO_PLAN_STARTER` opcional
- `MERCADO_PAGO_PLAN_PROFESSIONAL` opcional
- `MERCADO_PAGO_PLAN_ENTERPRISE` opcional

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
- `20260513200000_mercado_pago_plan_mapping`

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

## Mercado Pago

- Criar conta em `https://www.mercadopago.com.br/developers`.
- Criar aplicacao em Suas integracoes.
- Copiar o Access Token de producao ou sandbox para `MERCADO_PAGO_ACCESS_TOKEN`.
- Criar chave secreta do webhook e configurar em `MERCADO_PAGO_WEBHOOK_SECRET`.
- Configurar URL de webhook:
  - producao: `https://app.seudominio.com/api/webhooks/mercadopago`
  - local com tunnel: `https://seu-tunnel.ngrok.app/api/webhooks/mercadopago`
- Habilitar notificacoes de pagamentos e assinaturas/preapproval.
- Validar eventos com headers `x-signature` e `x-request-id`.
- Testar sandbox com comprador de teste antes de publicar.

## Testes obrigatorios

- Criar tenant por `/signup`.
- Entrar por `/login`.
- Acessar `/dashboard` autenticado.
- Confirmar que `/api/stores` retorna apenas lojas do tenant.
- Testar acesso sem cookie e confirmar redirecionamento para `/login`.
- Testar checkout Stripe ou Mercado Pago.
- Testar webhook Stripe com assinatura valida.
- Testar webhook Mercado Pago com assinatura valida.
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
- `POST /api/billing/create-checkout`
- `POST /api/billing/webhook/stripe`
- `POST /api/webhooks/mercadopago`

## Teste sandbox Mercado Pago

1. Configurar `MERCADO_PAGO_ACCESS_TOKEN` sandbox.
2. Abrir sessao autenticada de um tenant em trial.
3. Chamar `POST /api/billing/create-checkout` com `provider=MERCADO_PAGO`.
4. Concluir pagamento com usuario comprador de teste.
5. Confirmar que o webhook atualizou `TenantSubscription.status` para `ACTIVE`.
6. Simular pagamento rejeitado/cancelado e confirmar `BLOCKED` ou `CANCELED`.

## Teste de bloqueio automatico

1. Ajustar `trialEndsAt` de um tenant para uma data passada.
2. Acessar qualquer rota protegida.
3. Confirmar redirecionamento para `/billing/blocked`.
4. Confirmar que `TenantSubscription.status` foi atualizado para `BLOCKED`.
5. Reativar assinatura via webhook aprovado e confirmar acesso liberado.
