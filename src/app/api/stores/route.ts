import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { INITIAL_STORES } from "@/lib/tenant-provisioning";
import { getTenantContextFromRequest } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";

async function ensureDefaultStores(tenantId: string) {
  const count = await prisma.store.count({
    where: { tenantId },
  });

  if (count === 0) {
    await prisma.store.createMany({
      data: INITIAL_STORES.map((store) => ({
        name: store.name,
        location: store.location,
        tenantId,
      })),
    });
  }
}

export const GET = withApiHandler(async (request) => {
  const tenant = await getTenantContextFromRequest(request);

  await ensureDefaultStores(tenant.id);

  const stores = await prisma.store.findMany({
    where: {
      tenantId: tenant.id,
    },
    orderBy: {
      name: "asc",
    },
  });

  return NextResponse.json(stores, { status: 200 });
});
