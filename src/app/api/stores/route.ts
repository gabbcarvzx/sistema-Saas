import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { INITIAL_STORES } from "@/lib/tenant-provisioning";
import { getTenantContextFromRequest } from "@/lib/tenant-context";
import { storeSchema } from "@/lib/store-schema";

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
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return NextResponse.json(stores, { status: 200 });
});

export const POST = withApiHandler(async (request) => {
  const tenant = await getTenantContextFromRequest(request);
  const parsed = storeSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const store = await prisma.store.create({
    data: {
      tenantId: tenant.id,
      name: parsed.data.name,
      location: parsed.data.location,
    },
  });

  return NextResponse.json(store, { status: 201 });
});
