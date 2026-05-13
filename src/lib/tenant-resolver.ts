const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const ROOT_HOST_PREFIXES = new Set(["www", "app"]);
const APP_ROOT_DOMAIN = process.env.APP_ROOT_DOMAIN?.toLowerCase();

export const DEFAULT_TENANT_SLUG =
  process.env.DEFAULT_TENANT_SLUG ?? "demo-oficina";

function normalizeSlug(value: string | null | undefined) {
  const slug = value?.trim().toLowerCase();

  if (!slug) {
    return null;
  }

  return slug.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
}

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));

  if (!match) {
    return null;
  }

  return decodeURIComponent(match.slice(name.length + 1));
}

function getSubdomainFromHost(hostHeader: string | null) {
  if (!hostHeader) {
    return null;
  }

  const host = hostHeader.split(":")[0]?.toLowerCase();

  if (!host || LOCAL_HOSTS.has(host)) {
    return null;
  }

  if (APP_ROOT_DOMAIN && host.endsWith(`.${APP_ROOT_DOMAIN}`)) {
    const subdomain = host.slice(0, -(APP_ROOT_DOMAIN.length + 1));
    return subdomain.includes(".") ? null : subdomain;
  }

  const [prefix] = host.split(".");

  if (!prefix || ROOT_HOST_PREFIXES.has(prefix)) {
    return null;
  }

  return prefix;
}

export function resolveTenantSlug(headers: Headers, requestUrl?: URL | string) {
  const url =
    typeof requestUrl === "string"
      ? new URL(requestUrl)
      : requestUrl ?? null;

  return (
    normalizeSlug(headers.get("x-tenant-slug")) ??
    normalizeSlug(getSubdomainFromHost(headers.get("host"))) ??
    normalizeSlug(url?.searchParams.get("tenant")) ??
    normalizeSlug(getCookieValue(headers.get("cookie"), "tenantSlug")) ??
    DEFAULT_TENANT_SLUG
  );
}
