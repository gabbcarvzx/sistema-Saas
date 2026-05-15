import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { prisma } from "../../src/lib/prisma";

test.describe.configure({ mode: "serial" });

const timestamp = Date.now();
const baseURL = "http://127.0.0.1:3000";

const tenantA = {
  companyName: `Oficina Teste ${timestamp}`,
  tenantSlug: `oficina-teste-${timestamp}`,
  adminName: "Admin Teste",
  adminEmail: `teste-${timestamp}@email.com`,
  password: "Teste123456!",
};

const tenantB = {
  companyName: `Autopecas Teste ${timestamp}`,
  tenantSlug: `autopecas-teste-${timestamp}`,
  adminName: "Admin B",
  adminEmail: `teste-b-${timestamp}@email.com`,
  password: "Teste123456!",
};

async function signupTenant(request: APIRequestContext, tenant: typeof tenantA) {
  const response = await request.post("/api/signup", {
    data: tenant,
  });

  expect([200, 201, 303]).toContain(response.status());
}

async function login(page: Page, tenant = tenantA) {
  await page.goto(`/login?tenant=${tenant.tenantSlug}`);
  await page.fill('input[name="tenantSlug"]', tenant.tenantSlug);
  await page.fill('input[name="email"]', tenant.adminEmail);
  await page.fill('input[name="password"]', tenant.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/app\/dashboard|\/billing\/blocked/);
}

async function tenantBySlug(slug: string) {
  return prisma.tenant.findUniqueOrThrow({
    where: { slug },
    include: { subscription: true },
  });
}

test.describe("Fluxo SaaS multi-tenant", () => {
  test("landing publica vende o produto", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Pare de perder dinheiro")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Comecar teste gratis/i }).first(),
    ).toBeVisible();
  });

  test("pricing publico mostra os 3 planos", async ({ page }) => {
    await page.goto("/pricing");

    await expect(page.getByRole("heading", { name: "Starter" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pro" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Business" })).toBeVisible();
    await expect(page.getByText("Mais escolhido")).toBeVisible();
  });

  test("signup cria tenant trial com Tenant, User, Store e TenantSubscription", async ({
    request,
  }) => {
    await signupTenant(request, tenantA);
    await signupTenant(request, tenantB);

    const tenant = await tenantBySlug(tenantA.tenantSlug);
    const [user, store] = await Promise.all([
      prisma.user.findFirst({
        where: { tenantId: tenant.id, email: tenantA.adminEmail },
      }),
      prisma.store.findFirst({
        where: { tenantId: tenant.id },
      }),
    ]);

    expect(user).toBeTruthy();
    expect(store).toBeTruthy();
    expect(tenant.subscription).toBeTruthy();
    expect(tenant.subscription?.status).toBe("TRIAL");
    expect(tenant.subscription?.trialStartsAt).toBeTruthy();
    expect(tenant.subscription?.trialEndsAt?.getTime()).toBeGreaterThan(Date.now());
  });

  test("login cria cookies HTTP-only", async ({ page, context }) => {
    await login(page);

    const cookies = await context.cookies();
    const session = cookies.find((cookie) => cookie.name === "session");
    const tenantSlug = cookies.find((cookie) => cookie.name === "tenantSlug");

    expect(session?.httpOnly).toBe(true);
    expect(tenantSlug?.httpOnly).toBe(true);
  });

  test("/app/dashboard autenticado funciona para TRIAL", async ({ page }) => {
    await prisma.tenantSubscription.updateMany({
      where: { tenant: { slug: tenantA.tenantSlug } },
      data: { status: "TRIAL" },
    });
    await login(page);
    await page.goto("/app/dashboard");

    await expect(page).not.toHaveURL(/login/);
    await expect(page.getByText("Dashboard executivo")).toBeVisible();
  });

  test("/app/account autenticado mostra conta", async ({ page }) => {
    await login(page);
    await page.goto("/app/account");

    await expect(page.getByText("Dados da empresa")).toBeVisible();
    await expect(page.getByText(tenantA.tenantSlug).first()).toBeVisible();
  });

  test("/app/billing autenticado carrega planos e CTA de checkout", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/app/billing");

    await expect(page).not.toHaveURL(/login/);
    await expect(page.getByText("Billing e assinatura")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Assinar agora/i }).first(),
    ).toBeVisible();
  });

  test("logout remove sessao e /app volta para login", async ({ page, context }) => {
    await login(page);
    await page.goto("/app/account");
    await page.getByRole("button", { name: "Sair" }).last().click();

    await expect(page).toHaveURL(/\/login/);

    const cookies = await context.cookies();
    expect(cookies.find((cookie) => cookie.name === "session")).toBeFalsy();

    await page.goto("/app");
    await expect(page).toHaveURL(/\/login/);
  });

  test("APIs recusam sem cookie mesmo com tenant na query", async ({ request }) => {
    const products = await request.get(`/api/products?tenant=${tenantA.tenantSlug}`);
    const stores = await request.get(`/api/stores?tenant=${tenantA.tenantSlug}`);

    expect([401, 403, 404]).toContain(products.status());
    expect([401, 403, 404]).toContain(stores.status());
  });

  test("tenant A nao acessa dados do tenant B", async ({ page }) => {
    await login(page);

    const response = await page.request.get(
      `/api/stores?tenant=${tenantB.tenantSlug}`,
    );

    expect([401, 403, 404]).toContain(response.status());
  });

  test("TRIAL e ACTIVE acessam dashboard", async ({ page }) => {
    for (const status of ["TRIAL", "ACTIVE"] as const) {
      await prisma.tenantSubscription.updateMany({
        where: { tenant: { slug: tenantA.tenantSlug } },
        data: { status },
      });

      await login(page);
      await page.goto("/app/dashboard");
      await expect(page).not.toHaveURL(/billing\/blocked/);
      await expect(page.getByText("Dashboard executivo")).toBeVisible();
    }
  });

  test("BLOCKED e CANCELED bloqueiam app operacional", async ({ page }) => {
    for (const status of ["BLOCKED", "CANCELED"] as const) {
      await prisma.tenantSubscription.updateMany({
        where: { tenant: { slug: tenantA.tenantSlug } },
        data: { status },
      });

      await login(page);
      await page.goto("/app/dashboard");
      await expect(page).toHaveURL(/billing\/blocked/);

      const api = await page.request.get("/api/products");
      expect([402, 403]).toContain(api.status());
    }
  });

  test("checkout e /app/billing funcionam para bloqueado autenticado", async ({
    page,
  }) => {
    await prisma.tenantSubscription.updateMany({
      where: { tenant: { slug: tenantA.tenantSlug } },
      data: { status: "BLOCKED" },
    });

    await login(page);
    await page.goto("/app/billing");
    await expect(page).not.toHaveURL(/billing\/blocked/);
    await expect(page.getByText("Billing e assinatura")).toBeVisible();

    const checkout = await page.request.post("/api/billing/create-checkout", {
      data: {
        provider: "MERCADO_PAGO",
        plan: "PROFESSIONAL",
        payerEmail: tenantA.adminEmail,
        successUrl: `${baseURL}/app/billing?checkout=success`,
        cancelUrl: `${baseURL}/app/billing?checkout=cancel`,
      },
    });

    expect([201, 500]).toContain(checkout.status());
    expect([401, 402, 403]).not.toContain(checkout.status());
  });
});
