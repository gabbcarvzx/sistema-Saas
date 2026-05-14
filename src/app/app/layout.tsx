import type { ReactNode } from "react";
import { getTenantContext } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";

export default async function ProtectedAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  await getTenantContext();

  return children;
}
