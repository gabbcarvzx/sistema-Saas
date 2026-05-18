const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const ROOT_HOST_PREFIXES = new Set(["www", "app"]);

export const DEFAULT_TENANT_SLUG =
  process.env.DEFAULT_TENANT_SLUG ?? "demo-oficina";

const TRUSTED_TENANT_HEADER = "x-tenant-slug";

function getAppRootDomain() {
  return process.env.APP_ROOT_DOMAIN?.trim().toLowerCase() ?? null;
}

function normalizeSlug(value: string | null | undefined) {
  const slug = value?.trim().toLowerCase();

  if (!slug) {
    return null;
  }

  return slug.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
}

function getSubdomainFromHost(hostHeader: string | null) {
  if (!hostHeader) {
    return null;
  }

  const host = hostHeader.split(":")[0]?.toLowerCase();

  if (!host || LOCAL_HOSTS.has(host)) {
    return null;
  }

  const appRootDomain = getAppRootDomain();

  if (appRootDomain && host === appRootDomain) {
    return null;
  }

  if (appRootDomain && host.endsWith(`.${appRootDomain}`)) {
    const subdomain = host.slice(0, -(appRootDomain.length + 1));
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
    normalizeSlug(url?.searchParams.get("tenant")) ??
    normalizeSlug(getSubdomainFromHost(headers.get("host"))) ??
    DEFAULT_TENANT_SLUG
  );
}

export function resolveTenantSlugFromTrustedHeaders(headers: Headers) {
  return (
    normalizeSlug(headers.get(TRUSTED_TENANT_HEADER)) ??
    resolveTenantSlug(headers)
  );
}
