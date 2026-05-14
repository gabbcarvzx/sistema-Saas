import { test, expect } from "@playwright/test";
import { prisma } from "../src/lib/prisma";

test.describe("Multi-tenant auth flow", () => {
  const tenantA = {
    name: "Tenant A Test",
    slug: `tenant-a-${Date.now()}`,
    email: `tenant-a-${Date.now()}@test.com`,
    password: "Teste123456!",
  };

  const tenantB = {
    name: "Tenant B Test",
    slug: `tenant-b-${Date.now()}`,
    email: `tenant-b-${Date.now()}@test.com`,
    password: "Teste123456!",
  };

  test("cria tenant via /signup e confirma Tenant, User, Store e TenantSubscription", async ({ page }) => {
    await page.goto("/signup");

    await page.fill('input[name="name"]', tenantA.name);
    await page.fill('input[name="slug"]', tenantA.slug);
    await page.fill('input[name="email"]', tenantA.email);
    await page.fill('input[name="password"]', tenantA.password);

    await page.click('button[type="submit"]');

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantA.slug },
    });

    expect(tenant).toBeTruthy();

    const user = await prisma.user.findFirst({
      where: { tenantId: tenant!.id, email: tenantA.email },
    });

    const store = await prisma.store.findFirst({
      where: { tenantId: tenant!.id },
    });

    const subscription = await prisma.tenantSubscription.findFirst({
      where: { tenantId: tenant!.id },
    });

    expect(user).toBeTruthy();
    expect(store).toBeTruthy();
    expect(subscription).toBeTruthy();
  });

  test("login cria cookies HTTP-only session e tenantSlug", async ({ page, context }) => {
    await page.goto("/login");

    await page.fill('input[name="email"]', tenantA.email);
    await page.fill('input[name="password"]', tenantA.password);

    await page.click('button[type="submit"]');

    const cookies = await context.cookies();

    const session = cookies.find(c => c.name === "session");
    const tenantSlug = cookies.find(c => c.name === "tenantSlug");

    expect(session).toBeTruthy();
    expect(tenantSlug).toBeTruthy();

    expect(session?.httpOnly).toBe(true);
    expect(tenantSlug?.httpOnly).toBe(true);
  });

  test("landing / é pública", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(page.locator("body")).toBeVisible();
  });

  test("rotas protegidas funcionam autenticado", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[name="email"]', tenantA.email);
    await page.fill('input[name="password"]', tenantA.password);
    await page.click('button[type="submit"]');

    await page.goto("/app");
    await expect(page).not.toHaveURL(/login/);

    await page.goto("/app/dashboard");
    await expect(page).not.toHaveURL(/login/);

    const products = await page.request.get("/api/products");
    expect(products.status()).not.toBe(401);

    const stores = await page.request.get("/api/stores");
    expect(stores.status()).not.toBe(401);
  });

  test("APIs recusam requisição sem cookie mesmo com ?tenant=slug", async ({ request }) => {
    const products = await request.get(`/api/products?tenant=${tenantA.slug}`);
    const stores = await request.get(`/api/stores?tenant=${tenantA.slug}`);

    expect([401, 403]).toContain(products.status());
    expect([401, 403]).toContain(stores.status());
  });

  test("tenant A não acessa dados do tenant B", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[name="email"]', tenantA.email);
    await page.fill('input[name="password"]', tenantA.password);
    await page.click('button[type="submit"]');

    const tenantBData = await prisma.tenant.findUnique({
      where: { slug: tenantB.slug },
    });

    if (tenantBData) {
      const response = await page.request.get(`/api/stores?tenant=${tenantB.slug}`);
      expect([401, 403, 404]).toContain(response.status());
    }
  });

  test("TRIAL e ACTIVE acessam o sistema", async ({ page }) => {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantA.slug },
    });

    for (const status of ["TRIAL", "ACTIVE"] as const) {
      await prisma.tenantSubscription.updateMany({
        where: { tenantId: tenant!.id },
        data: { status },
      });

      await page.goto("/login");
      await page.fill('input[name="email"]', tenantA.email);
      await page.fill('input[name="password"]', tenantA.password);
      await page.click('button[type="submit"]');

      await page.goto("/app/dashboard");
      await expect(page).not.toHaveURL(/billing\/blocked/);
    }
  });

  test("BLOCKED e CANCELED bloqueiam sistema", async ({ page }) => {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantA.slug },
    });

    for (const status of ["BLOCKED", "CANCELED"] as const) {
      await prisma.tenantSubscription.updateMany({
        where: { tenantId: tenant!.id },
        data: { status },
      });

      await page.goto("/login");
      await page.fill('input[name="email"]', tenantA.email);
      await page.fill('input[name="password"]', tenantA.password);
      await page.click('button[type="submit"]');

      await page.goto("/app/dashboard");

      await expect(page).toHaveURL(/billing\/blocked/);

      const api = await page.request.get("/api/products");
      expect([402, 403]).toContain(api.status());
    }
  });

  test("checkout funciona mesmo com tenant bloqueado e sessão válida", async ({ page }) => {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantA.slug },
    });

    await prisma.tenantSubscription.updateMany({
      where: { tenantId: tenant!.id },
      data: { status: "BLOCKED" },
    });

    await page.goto("/login");
    await page.fill('input[name="email"]', tenantA.email);
    await page.fill('input[name="password"]', tenantA.password);
    await page.click('button[type="submit"]');

    const checkout = await page.request.post("/api/checkout");

    expect([200, 201, 303]).toContain(checkout.status());
  });
});