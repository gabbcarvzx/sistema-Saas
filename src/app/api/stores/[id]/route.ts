import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { NotFoundError } from "@/lib/http-errors";
import { prisma } from "@/lib/prisma";
import { getTenantContextFromRequest } from "@/lib/tenant-context";
import { storeSchema } from "@/lib/store-schema";

type RouteContext = {
  params: {
    id: string;
  };
};

export const dynamic = "force-dynamic";

export const PUT = withApiHandler<RouteContext>(async (request, { params }) => {
  const tenant = await getTenantContextFromRequest(request);
  const parsed = storeSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const result = await prisma.store.updateMany({
    where: {
      id: params.id,
      tenantId: tenant.id,
    },
    data: {
      name: parsed.data.name,
      location: parsed.data.location,
    },
  });

  if (result.count === 0) {
    throw new NotFoundError("Loja nao encontrada.");
  }

  const store = await prisma.store.findUniqueOrThrow({
    where: {
      tenantId_id: {
        tenantId: tenant.id,
        id: params.id,
      },
    },
  });

  return NextResponse.json(store);
});

export const DELETE = withApiHandler<RouteContext>(async (request, { params }) => {
  const tenant = await getTenantContextFromRequest(request);

  const store = await prisma.store.findUnique({
    where: {
      tenantId_id: {
        tenantId: tenant.id,
        id: params.id,
      },
    },
    select: {
      id: true,
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  if (!store) {
    throw new NotFoundError("Loja nao encontrada.");
  }

  if (store._count.products > 0) {
    return NextResponse.json(
      {
        message:
          "Esta loja possui produtos vinculados. Remova ou mova os produtos antes de excluir.",
      },
      { status: 409 },
    );
  }

  await prisma.store.delete({
    where: {
      tenantId_id: {
        tenantId: tenant.id,
        id: params.id,
      },
    },
  });

  return NextResponse.json({ ok: true });
});
