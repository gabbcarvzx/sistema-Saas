# Checklist de producao SaaS

## Variaveis obrigatorias

- `DATABASE_URL`: conexao PostgreSQL usada pelo runtime via Prisma 7 e `@prisma/adapter-pg`; em Vercel use Supabase Supavisor Transaction pooler na porta `6543` com `?pgbouncer=true&sslmode=require`.
- `DIRECT_URL`: conexao usada por Prisma CLI, migrations, `db pull`, seed e Studio; use Supabase Supavisor Session pooler na porta `5432` com `?sslmode=require`.
- `PGPOOL_MAX`: tamanho maximo do pool `pg` por instancia serverless; comece com `3`.
- `PGCONNECT_TIMEOUT_MS`: timeout de conexao PostgreSQL; recomendado `10000`.
- `PGIDLE_TIMEOUT_MS`: tempo para liberar conexoes ociosas; recomendado `30000`.
- `APP_ROOT_DOMAIN`: dominio raiz para resolver tenants por subdominio, exemplo `seudominio.com`.
- `APP_URL`: URL publica da aplicacao, usada para montar URLs externas.
- `INTERNAL_ACCESS_SECRET`: segredo interno entre middleware e `/api/internal/tenant-access`; use 32+ caracteres.
- `JWT_SECRET`: segredo de assinatura HS256 dos cookies de sessao; use 32+ caracteres e rotacione em incidente.
- `JWT_EXPIRES_IN`: TTL do token e do cookie `session`, exemplo `7d`.
- `JWT_ISSUER`: emissor esperado no JWT.
- `JWT_AUDIENCE`: audience esperada no JWT.
- `PASSWORD_HASH_COST`: custo do bcrypt, recomendado `12` ou maior se a latencia permitir.
- `MERCADO_PAGO_ACCESS_TOKEN`: token sandbox ou producao do Mercado Pago.
- `MERCADO_PAGO_WEBHOOK_SECRET`: chave secreta configurada no webhook Mercado Pago.
- `MERCADO_PAGO_WEBHOOK_URL`: endpoint publico `https://app.seudominio.com/api/webhooks/mercadopago`.
- `DEFAULT_TRIAL_DAYS`: dias de trial usados no provisionamento de tenant e planos.

## Variaveis opcionais

- `DEFAULT_TENANT_SLUG`, `DEFAULT_TENANT_NAME`, `SUPPORT_EMAIL`.
- `MERCADO_PAGO_WEBHOOK_TOLERANCE_MS`: tolerancia anti-replay do webhook, padrao `600000`.
- `MERCADO_PAGO_PLAN_STARTER`, `MERCADO_PAGO_PLAN_PROFESSIONAL`, `MERCADO_PAGO_PLAN_ENTERPRISE`: IDs de planos preapproval, se usar planos gerenciados no Mercado Pago.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PROFESSIONAL`, `STRIPE_PRICE_ENTERPRISE`: opcionais se Stripe for mantido.

## Ordem de deploy

1. Configurar variaveis de ambiente em sandbox.
2. Rodar `npm ci`.
3. Rodar `npm run db:check`.
4. Rodar `npm run db:generate`.
5. Rodar `npm run db:migrate`.
6. Rodar `npm run db:seed`.
7. Rodar `npm run typecheck`.
8. Rodar `npm run test`.
9. Rodar `npm run lint`.
10. Rodar `npm run build`.
11. Configurar DNS wildcard `*.seudominio.com`.
12. Configurar webhooks Mercado Pago apontando para `MERCADO_PAGO_WEBHOOK_URL`.
13. Publicar e executar smoke test autenticado.

## Migracoes obrigatorias

- `20260513133000_saas_multi_tenant`
- `20260513170000_commercial_saas_foundation`
- `20260513190000_stripe_plan_codes`
- `20260513200000_mercado_pago_plan_mapping`
- `20260513223000_harden_billing_tenant_indexes`

## Testes obrigatorios

- Rodar `npm run db:check` para validar DNS, TCP e `select 1`.
- Rodar `npx prisma generate`.
- Rodar `npx prisma db pull --config=./prisma.config.ts`.
- Criar tenant por `/signup` e confirmar `Tenant`, `User`, `Store` e `TenantSubscription` com `tenantId`.
- Entrar por `/login` e confirmar cookie `session` HTTP-only e `tenantSlug` HTTP-only.
- Acessar `/dashboard`, `/`, `/api/products` e `/api/stores` autenticado.
- Confirmar que APIs recusam requisicao sem cookie mesmo com `?tenant=slug`.
- Confirmar que um usuario de tenant A nao acessa dados do tenant B.
- Confirmar que `TRIAL` e `ACTIVE` acessam o sistema.
- Confirmar que `BLOCKED` e `CANCELED` redirecionam para `/billing/blocked` ou retornam `402`.
- Confirmar que checkout ainda funciona para tenant bloqueado quando a sessao e valida.

## Como evitar P1001 com Supabase

- Nao use `db.PROJECT_REF.supabase.co:5432` na Vercel, porque a conexao direta do Supabase resolve para IPv6.
- Para ambiente local sem IPv6, tambem prefira Supavisor Session pooler na porta `5432`.
- Para runtime serverless, use Supavisor Transaction pooler na porta `6543`.
- Sempre inclua `sslmode=require`.
- Se `npm run db:check` mostrar DNS apenas IPv6 e TCP falso, a rede atual nao consegue usar a conexao direta.
- Se o pooler tambem falhar, confirme no painel Supabase se o projeto esta ativo, se a senha esta correta e se nao ha restricao de rede/IP.

## Validacao Mercado Pago

- Criar comprador e vendedor de teste no painel Mercado Pago.
- Usar `MERCADO_PAGO_ACCESS_TOKEN` sandbox.
- Configurar webhook com eventos de `payment` e `preapproval`.
- Confirmar headers `x-signature` e `x-request-id`.
- Enviar evento valido e confirmar `PaymentEvent.processedAt`.
- Concluir pagamento aprovado e confirmar `TenantSubscription.status=ACTIVE`.
- Simular pagamento rejeitado/cancelado e confirmar `TenantSubscription.status=BLOCKED` ou `CANCELED`.
- Enviar assinatura invalida e confirmar retorno `401` sem alterar assinatura.

## Smoke test pos deploy

- `GET /login`
- `GET /signup`
- `POST /api/signup`
- `POST /api/login`
- `GET /dashboard` com cookie autenticado
- `GET /api/stores` com cookie autenticado
- `POST /api/billing/create-checkout`
- `POST /api/webhooks/mercadopago` com assinatura valida

## Proximos passos comerciais

- Criar pagina de planos com upgrade/downgrade self-service.
- Adicionar trial reminder por email antes do vencimento.
- Criar rotina agendada para marcar inadimplencia real como `BLOCKED`.
- Adicionar tela de billing no app com status, plano, proxima cobranca e link de pagamento.
- Instrumentar MRR, churn, conversao trial -> pago e falhas de pagamento.
