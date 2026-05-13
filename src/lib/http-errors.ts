export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(code: string, message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Recurso nao encontrado.", details?: unknown) {
    super("NOT_FOUND", message, 404, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflito de dados.", details?: unknown) {
    super("CONFLICT", message, 409, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Nao autorizado.", details?: unknown) {
    super("UNAUTHORIZED", message, 401, details);
  }
}

export class PlanExpiredError extends AppError {
  constructor(message = "Plano expirado ou bloqueado.", details?: unknown) {
    super("PLAN_EXPIRED", message, 402, details);
  }
}

export class ConfigurationError extends AppError {
  constructor(message = "Configuracao obrigatoria ausente.", details?: unknown) {
    super("CONFIGURATION_ERROR", message, 500, details);
  }
}
