import { describe, expect, it } from "vitest";
import { POST } from "../src/app/api/logout/route";

describe("POST /api/logout", () => {
  it("limpa cookies de sessao e redireciona para login", async () => {
    const response = await POST(
      new Request("https://stockpro.test/api/logout", { method: "POST" }),
      undefined,
    );
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://stockpro.test/login");
    expect(setCookie).toContain("session=");
    expect(setCookie).toContain("tenantSlug=");
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie.toLowerCase()).toContain("max-age=0");
  });
});
