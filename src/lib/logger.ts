type LogContext = Record<string, unknown>;

type LogLevel = "error" | "info" | "warn";

function writeLog(level: LogLevel, scope: string, message: string, context?: LogContext) {
  const entry = {
    context: context ?? {},
    level,
    message,
    scope,
    timestamp: new Date().toISOString(),
  };

  const serialized = JSON.stringify(entry);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.info(serialized);
}

export function logError(
  scope: string,
  message: string,
  error: unknown,
  context?: LogContext,
) {
  writeLog("error", scope, message, {
    ...context,
    error:
      error instanceof Error
        ? {
            message: error.message,
            name: error.name,
            stack: error.stack,
          }
        : error,
  });
}

