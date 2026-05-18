import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { AppError } from "@/lib/http-errors";
import { logger } from "@/lib/logger";

type ApiHandler<TContext> = (
  request: Request,
  context: TContext,
) => Promise<Response> | Response;

function getRequestPath(request: Request) {
  try {
    return new URL(request.url).pathname;
  } catch {
    return request.url;
  }
}

function getRequestId(request: Request) {
  return request.headers.get("x-request-id") ?? randomUUID();
}

export function withApiHandler<TContext = undefined>(
  handler: ApiHandler<TContext>,
) {
  return async (request: Request, context: TContext) => {
    const startedAt = Date.now();
    const requestId = getRequestId(request);
    const path = getRequestPath(request);

    try {
      const response = await handler(request, context);

      logger.info("api.request.completed", {
        requestId,
        method: request.method,
        path,
        status: response.status,
        durationMs: Date.now() - startedAt,
        tenantId: request.headers.get("x-tenant-id"),
        tenantSlug: request.headers.get("x-tenant-slug"),
      });

      response.headers.set("x-request-id", requestId);
      return response;
    } catch (error) {
      const status = error instanceof AppError ? error.statusCode : 500;
      const message =
        error instanceof AppError
          ? error.message
          : "Erro inesperado ao processar a requisicao.";
      const code = error instanceof AppError ? error.code : "INTERNAL_ERROR";

      logger.error("api.request.failed", {
        requestId,
        method: request.method,
        path,
        status,
        durationMs: Date.now() - startedAt,
        tenantId: request.headers.get("x-tenant-id"),
        tenantSlug: request.headers.get("x-tenant-slug"),
        error: error instanceof Error ? error : new Error(String(error)),
      });

      return NextResponse.json(
        {
          code,
          message,
          requestId,
          ...(status < 500 && error instanceof AppError && error.details
            ? { details: error.details }
            : {}),
        },
        { status, headers: { "x-request-id": requestId } },
      );
    }
  };
}
