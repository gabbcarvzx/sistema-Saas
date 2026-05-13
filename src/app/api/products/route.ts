import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { getPrismaErrorCode } from "@/lib/prisma-error";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/product-schema";
import { NotFoundError } from "@/lib/http-errors";
import { getTenantContextFromRequest } from "@/lib/tenant-context";

export const GET = withApiHandler(async (request) => {
  const tenant = await getTenantContextFromRequest(request);

  const products = await prisma.product.findMany({
    where: {
      tenantId: tenant.id,
    },
    include: {
      store: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return NextResponse.json(products);
});

export const POST = withApiHandler(async (request) => {
  const tenant = await getTenantContextFromRequest(request);
  const payload = await request.json();
  const parsed = productSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados invalidos.", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const store = await prisma.store.findFirst({
      where: {
        id: parsed.data.storeId,
        tenantId: tenant.id,
      },
      select: { id: true },
    });

    if (!store) {
      throw new NotFoundError("Loja nao encontrada para este cliente.");
    }

    const product = await prisma.product.create({
      data: {
        ...parsed.data,
        tenantId: tenant.id,
      },
      include: {
        store: true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (getPrismaErrorCode(error) === "P2002") {
      return NextResponse.json(
        { message: "Ja existe um produto com este codigo." },
        { status: 409 },
      );
    }

    throw error;
  }
});
