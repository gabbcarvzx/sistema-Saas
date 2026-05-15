import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { getPrismaErrorCode } from "@/lib/prisma-error";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/product-schema";
import { NotFoundError } from "@/lib/http-errors";
import { getTenantContextFromRequest } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";

/**
 * GET /api/produtos
 */
export const GET = withApiHandler(async (request) => {
  const tenant = await getTenantContextFromRequest(request);

  const products = await prisma.product.findMany({
    where: {
      tenantId: tenant.id,
    },
    include: {
      store: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return NextResponse.json(products, { status: 200 });
});

/**
 * POST /api/produtos
 */
export const POST = withApiHandler(async (request) => {
  const tenant = await getTenantContextFromRequest(request);
  const payload = await request.json();

  const parsed = productSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Dados inválidos.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    // Verifica se a loja pertence ao tenant
    const store = await prisma.store.findFirst({
      where: {
        id: parsed.data.storeId,
        tenantId: tenant.id,
      },
      select: { id: true },
    });

    if (!store) {
      throw new NotFoundError("Loja não encontrada para este cliente.");
    }

    const product = await prisma.product.create({
      data: {
        ...parsed.data,
        tenantId: tenant.id,
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: unknown) {
    if (getPrismaErrorCode(error) === "P2002") {
      return NextResponse.json(
        { message: "Já existe um produto com este código." },
        { status: 409 },
      );
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { message: error.message },
        { status: 404 },
      );
    }

    throw error;
  }
});
