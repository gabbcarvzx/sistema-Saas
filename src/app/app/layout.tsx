import type { ReactNode } from "react";
import { getAppContext } from "@/lib/app-context";
import { AppShell } from "@/app/app/app-shell";

export const dynamic = "force-dynamic";

export default async function ProtectedAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const context = await getAppContext();

  return (
    <AppShell
      tenant={{
        name: context.tenant.name,
        slug: context.tenant.slug,
        subscriptionStatus: context.tenant.subscription?.status ?? "MISSING",
        trialEndsAt: context.tenant.subscription?.trialEndsAt?.toISOString() ?? null,
      }}
      user={{
        name: context.user.name,
        email: context.user.email,
        role: context.user.role,
      }}
    >
      {children}
    </AppShell>
  );
}
