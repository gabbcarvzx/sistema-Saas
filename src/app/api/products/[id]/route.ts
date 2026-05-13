import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { getPrismaErrorCode } from "@/lib/prisma-error";
import { NotFoundError } from "@/lib/http-errors";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/product-schema";
import { getTenantContextFromRequest } from "@/lib/tenant-context";

type RouteContext = {
  params: {
    id: string;
  };
};

export const PUT = withApiHandler<RouteContext>(async (request, { params }) => {
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
    const [productExists, storeExists] = await Promise.all([
      prisma.product.findFirst({
        where: {
          id: params.id,
          tenantId: tenant.id,
        },
        select: { id: true },
      }),
      prisma.store.findFirst({
        where: {
          id: parsed.data.storeId,
          tenantId: tenant.id,
        },
        select: { id: true },
      }),
    ]);

    if (!productExists) {
      throw new NotFoundError("Produto nao encontrado.");
    }

    if (!storeExists) {
      throw new NotFoundError("Loja nao encontrada para este cliente.");
    }

    const product = await prisma.product.update({
      where: {
        tenantId_id: {
          tenantId: tenant.id,
          id: params.id,
        },
      },
      data: parsed.data,
      include: {
        store: true,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    const errorCode = getPrismaErrorCode(error);

    if (errorCode === "P2002") {
      return NextResponse.json(
        { message: "Ja existe um produto com este codigo." },
        { status: 409 },
      );
    }

    if (errorCode === "P2025") {
      return NextResponse.json(
        { message: "Produto nao encontrado." },
        { status: 404 },
      );
    }

    throw error;
  }
});

export const DELETE = withApiHandler<RouteContext>(async (request, { params }) => {
  const tenant = await getTenantContextFromRequest(request);

  try {
    const result = await prisma.product.deleteMany({
      where: {
        id: params.id,
        tenantId: tenant.id,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { message: "Produto nao encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (getPrismaErrorCode(error) === "P2025") {
      return NextResponse.json(
        { message: "Produto nao encontrado." },
        { status: 404 },
      );
    }

    throw error;
  }
});
