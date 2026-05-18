import "dotenv/config";
import dns from "node:dns/promises";
import net from "node:net";
import pg from "pg";

type CheckResult = {
  name: string;
  configured: boolean;
  host?: string;
  port?: string;
  database?: string;
  query?: string;
  dns?: string[];
  tcp?: boolean;
  sql?: boolean;
  warning?: string;
  error?: string;
};

const CONNECT_TIMEOUT_MS = 8_000;

function describeUrl(name: string, rawUrl: string | undefined): CheckResult {
  if (!rawUrl) {
    return { name, configured: false } satisfies CheckResult;
  }

  const url = new URL(rawUrl);
  const port = url.port || "5432";
  const query = url.searchParams.toString();

  return {
    name,
    configured: true,
    host: url.hostname,
    port,
    database: url.pathname.replace(/^\//, ""),
    query,
    warning:
      url.hostname.startsWith("db.") &&
      url.hostname.endsWith(".supabase.co")
        ? "Conexao direta Supabase costuma exigir IPv6. Para local sem IPv6 e Vercel, use Supavisor pooler."
        : undefined,
  } satisfies CheckResult;
}

async function checkTcp(host: string, port: number) {
  return new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ host, port });
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, CONNECT_TIMEOUT_MS);

    socket.once("connect", () => {
      clearTimeout(timeout);
      socket.end();
      resolve(true);
    });

    socket.once("error", () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

async function checkDatabase(
  name: string,
  rawUrl: string | undefined,
): Promise<CheckResult> {
  const result = describeUrl(name, rawUrl);

  if (!result.configured || !rawUrl || !result.host || !result.port) {
    return result;
  }

  try {
    const records = await dns.lookup(result.host, { all: true });
    result.dns = records.map((record) => `${record.address}/IPv${record.family}`);
  } catch (error) {
    result.error = `DNS falhou: ${
      error instanceof Error ? error.message : String(error)
    }`;
    return result;
  }

  result.tcp = await checkTcp(result.host, Number(result.port));

  if (!result.tcp) {
    result.error = "TCP falhou antes do login PostgreSQL.";
    return result;
  }

  const client = new pg.Client({
    connectionString: rawUrl,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
  });

  try {
    await client.connect();
    await client.query("select 1");
    result.sql = true;
  } catch (error) {
    result.sql = false;
    result.error = error instanceof Error ? error.message : String(error);
  } finally {
    await client.end().catch(() => undefined);
  }

  return result;
}

async function main() {
  const results = await Promise.all([
    checkDatabase("DATABASE_URL", process.env.DATABASE_URL),
    checkDatabase("DIRECT_URL", process.env.DIRECT_URL),
  ]);

  for (const result of results) {
    console.log(JSON.stringify(result, null, 2));
  }

  if (results.some((result) => result.configured && !result.sql)) {
    process.exitCode = 1;
  }
}

void main();
