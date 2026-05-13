type LogLevel = "debug" | "info" | "warn" | "error";

type LogValue =
  | string
  | number
  | boolean
  | null
  | Date
  | Error
  | LogValue[]
  | { [key: string]: LogValue | undefined };

type LogContext = Record<string, LogValue | undefined>;

function normalizeValue(value: LogValue | undefined): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: process.env.NODE_ENV === "production" ? undefined : value.stack,
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, normalizeValue(item)])
        .filter(([, item]) => item !== undefined),
    );
  }

  return value;
}

function writeLog(level: LogLevel, message: string, context: LogContext = {}) {
  const normalizedContext = normalizeValue(context);
  const record = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(typeof normalizedContext === "object" &&
    normalizedContext !== null &&
    !Array.isArray(normalizedContext)
      ? normalizedContext
      : {}),
  };

  const payload = JSON.stringify(record);

  if (level === "error") {
    console.error(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }

  console.log(payload);
}

export const logger = {
  debug: (message: string, context?: LogContext) =>
    writeLog("debug", message, context),
  info: (message: string, context?: LogContext) =>
    writeLog("info", message, context),
  warn: (message: string, context?: LogContext) =>
    writeLog("warn", message, context),
  error: (message: string, context?: LogContext) =>
    writeLog("error", message, context),
};
