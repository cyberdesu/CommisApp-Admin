import "server-only";
import type { NextRequest } from "next/server";

type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

type AppLogger = {
  child: (context?: LogContext) => AppLogger;
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
};

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEY_PATTERN =
  /pass(word)?|secret|token|authorization|cookie|session|api[-_]?key|client[-_]?secret|access[-_]?key/i;
const REDACTED_VALUE = "[REDACTED]";
const MAX_SERIALIZE_DEPTH = 5;

function resolveLogLevel(): LogLevel {
  const configured = process.env.LOG_LEVEL?.trim().toLowerCase();

  if (
    configured === "debug" ||
    configured === "info" ||
    configured === "warn" ||
    configured === "error"
  ) {
    return configured;
  }

  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function shouldLog(level: LogLevel) {
  return (
    LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[resolveLogLevel()]
  );
}

function maskValueByKey(key: string, value: unknown) {
  if (!SENSITIVE_KEY_PATTERN.test(key)) {
    return value;
  }

  return REDACTED_VALUE;
}

function serializeError(error: Error) {
  const base: Record<string, unknown> = {
    name: error.name,
    message: error.message,
  };

  if (error.stack) {
    base.stack = error.stack;
  }

  const cause = (error as Error & { cause?: unknown }).cause;
  if (cause instanceof Error) {
    base.cause = serializeError(cause);
  }

  for (const [key, value] of Object.entries(error)) {
    if (key in base) continue;
    base[key] = maskValueByKey(key, sanitize(value, 1));
  }

  return base;
}

function sanitize(
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): unknown {
  if (value == null) return value;

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "symbol") {
    return value.toString();
  }

  if (typeof value === "function") {
    return `[Function ${value.name || "anonymous"}]`;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof URL) {
    return value.toString();
  }

  if (value instanceof Error) {
    return serializeError(value);
  }

  if (typeof Buffer !== "undefined" && value instanceof Buffer) {
    return `[Buffer length=${value.length}]`;
  }

  if (Array.isArray(value)) {
    if (depth >= MAX_SERIALIZE_DEPTH) return "[Array]";
    return value.map((item) => sanitize(item, depth + 1, seen));
  }

  if (typeof value === "object") {
    if (seen.has(value)) return "[Circular]";
    if (depth >= MAX_SERIALIZE_DEPTH) return "[Object]";

    seen.add(value);

    const output: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      output[key] = maskValueByKey(
        key,
        sanitize(nestedValue, depth + 1, seen),
      );
    }

    seen.delete(value);
    return output;
  }

  return String(value);
}

function getConsoleMethod(level: LogLevel) {
  switch (level) {
    case "debug":
      return console.debug;
    case "info":
      return console.info;
    case "warn":
      return console.warn;
    case "error":
      return console.error;
  }
}

function buildEntry(
  level: LogLevel,
  message: string,
  context: LogContext | undefined,
  baseContext: LogContext,
) {
  return sanitize({
    timestamp: new Date().toISOString(),
    level,
    message,
    service: "commisapp-admin",
    environment: process.env.APP_ENV || process.env.NODE_ENV || "unknown",
    pid: process.pid,
    ...baseContext,
    ...(context ?? {}),
  });
}

export function createLogger(baseContext: LogContext = {}): AppLogger {
  const emit = (level: LogLevel, message: string, context?: LogContext) => {
    if (!shouldLog(level)) return;

    const entry = buildEntry(level, message, context, baseContext);
    getConsoleMethod(level)(JSON.stringify(entry));
  };

  return {
    child(context = {}) {
      return createLogger({
        ...baseContext,
        ...context,
      });
    },
    debug(message, context) {
      emit("debug", message, context);
    },
    info(message, context) {
      emit("info", message, context);
    },
    warn(message, context) {
      emit("warn", message, context);
    },
    error(message, context) {
      emit("error", message, context);
    },
  };
}

function getRequestIdFromHeaders(headers: Headers) {
  return (
    headers.get("x-request-id") ||
    headers.get("x-correlation-id") ||
    crypto.randomUUID()
  );
}

function getClientIp(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return req.headers.get("x-real-ip");
}

export function createRequestLogger(
  req: NextRequest,
  context: LogContext = {},
) {
  return createLogger({
    requestId: getRequestIdFromHeaders(req.headers),
    method: req.method,
    path: req.nextUrl.pathname,
    clientIp: getClientIp(req),
    userAgent: req.headers.get("user-agent"),
    ...context,
  });
}

export type { AppLogger, LogContext, LogLevel };
