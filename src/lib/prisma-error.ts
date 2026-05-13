export function getPrismaErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }

  const { code } = error as { code?: unknown };

  return typeof code === "string" ? code : null;
}
