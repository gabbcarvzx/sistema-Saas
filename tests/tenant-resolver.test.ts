import { describe, expect, it } from "vitest";
import { resolveTenantSlug } from "../src/lib/tenant-resolver";

describe("resolveTenantSlug", () => {
  it("prefers explicit tenant header", () => {
    const headers = new Headers({
      "x-tenant-slug": "minha-oficina",
      host: "outro.app.com",
    });

    expect(resolveTenantSlug(headers)).toBe("minha-oficina");
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

  it("uses tenant query param as fallback on localhost", () => {
    const headers = new Headers({
      host: "localhost:3000",
    });

    expect(resolveTenantSlug(headers, "http://localhost:3000?tenant=cliente-a")).toBe(
      "cliente-a",
    );
  });
});
