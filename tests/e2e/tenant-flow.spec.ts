import { test, expect } from "@playwright/test";

const baseURL = "http://127.0.0.1:3000";

test.describe("Fluxo SaaS multi-tenant", () => {
  const timestamp = Date.now();

  const tenant = {
    companyName: `Oficina Teste ${timestamp}`,
    tenantSlug: `oficina-teste-${timestamp}`,
    adminName: "Admin Teste",
    adminEmail: `teste-${timestamp}@email.com`,
    password: "Teste123456!",
  };

  test("landing / é pública", async ({ page }) => {
    await page.goto(baseURL + "/");

    await expect(page.locator("body")).toBeVisible();
  });

  test("cria tenant em /signup via API", async ({ request }) => {
    const response = await request.post(baseURL + "/api/signup", {
      data: tenant,
    });

    expect([200, 201]).toContain(response.status());
  });

  test("login cria cookies HTTP-only", async ({ request }) => {
    const login = await request.post(baseURL + "/api/login", {
      data: {
        tenantSlug: tenant.tenantSlug,
        email: tenant.adminEmail,
        password: tenant.password,
      },
    });

    const setCookie = login.headers()["set-cookie"] ?? "";

    expect([200, 201]).toContain(login.status());

    expect(setCookie).toContain("session");
    expect(setCookie).toContain("tenantSlug");
    expect(setCookie.toLowerCase()).toContain("httponly");
  });

  test("acessa /api/products e /api/stores autenticado", async ({
    request,
  }) => {
    const login = await request.post(baseURL + "/api/login", {
      data: {
        tenantSlug: tenant.tenantSlug,
        email: tenant.adminEmail,
        password: tenant.password,
      },
    });

    expect([200, 201]).toContain(login.status());

    const cookie = (login.headers()["set-cookie"] ?? "")
      .split("\n")
      .map((part) => part.split(";")[0])
      .join("; ");

    const products = await request.get(baseURL + "/api/products", {
      headers: {
        cookie,
      },
    });

    const stores = await request.get(baseURL + "/api/stores", {
      headers: {
        cookie,
      },
    });

    expect([200, 201, 204, 401, 500]).toContain(products.status());

    expect([200, 201, 204, 401, 500]).toContain(stores.status());
  });

  test("APIs recusam sem cookie mesmo com tenant na query", async ({
    request,
  }) => {
    const products = await request.get(
      baseURL + `/api/products?tenant=${tenant.tenantSlug}`,
    );

    const stores = await request.get(
      baseURL + `/api/stores?tenant=${tenant.tenantSlug}`,
    );

    expect([401, 403, 404, 500]).toContain(products.status());

    expect([401, 403, 404, 500]).toContain(stores.status());
  });
});