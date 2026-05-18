import { afterEach, describe, expect, it } from "vitest";
import {
  resolveTenantSlug,
  resolveTenantSlugFromTrustedHeaders,
} from "../src/lib/tenant-resolver";

describe("resolveTenantSlug", () => {
  afterEach(() => {
    delete process.env.APP_ROOT_DOMAIN;
  });

  it("prefers explicit tenant query param", () => {
    const headers = new Headers({
      host: "cliente.stockpro.com",
    });

    expect(
      resolveTenantSlug(headers, "https://cliente.stockpro.com?tenant=manual"),
    ).toBe("manual");
  });

  it("ignores untrusted tenant header in direct resolution", () => {
    const headers = new Headers({
      host: "cliente.stockpro.com",
      "x-tenant-slug": "spoofed",
    });

    expect(resolveTenantSlug(headers)).toBe("cliente");
  });

  it("uses trusted tenant header for server component handoff", () => {
    const headers = new Headers({
      host: "stockfaster.vercel.app",
      "x-tenant-slug": "cliente-a",
    });

    expect(resolveTenantSlugFromTrustedHeaders(headers)).toBe("cliente-a");
  });

  it("uses subdomain outside localhost", () => {
    const headers = new Headers({
      host: "cliente.stockpro.com",
    });

    expect(resolveTenantSlug(headers)).toBe("cliente");
  });

  it("falls back to local default tenant", () => {
    const headers = new Headers({
      host: "localhost:3000",
    });

    expect(resolveTenantSlug(headers)).toBe("demo-oficina");
  });

  it("uses tenant query param on localhost", () => {
    const headers = new Headers({
      host: "localhost:3000",
    });

    expect(resolveTenantSlug(headers, "http://localhost:3000?tenant=cliente-a")).toBe(
      "cliente-a",
    );
  });

  it("ignores stale tenant cookie and falls back to default on root domain", () => {
    process.env.APP_ROOT_DOMAIN = "stockfaster.vercel.app";

    const headers = new Headers({
      host: "stockfaster.vercel.app",
      cookie: "tenantSlug=tenant-antigo",
    });

    expect(resolveTenantSlug(headers)).toBe("demo-oficina");
  });

  it("uses default tenant on the configured root domain", () => {
    process.env.APP_ROOT_DOMAIN = "stockfaster.vercel.app";

    const headers = new Headers({
      host: "stockfaster.vercel.app",
    });

    expect(resolveTenantSlug(headers)).toBe("demo-oficina");
  });

  it("keeps future subdomain tenants under the configured root domain", () => {
    process.env.APP_ROOT_DOMAIN = "stockfaster.vercel.app";

    const headers = new Headers({
      host: "cliente-a.stockfaster.vercel.app",
    });

    expect(resolveTenantSlug(headers)).toBe("cliente-a");
  });
});
