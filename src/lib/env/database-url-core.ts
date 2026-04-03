type AppEnv = "dev" | "prod";

function assertServerRuntime(context: string) {
  if (typeof window !== "undefined") {
    throw new Error(
      `${context} must not run in the browser. Import the server-only env wrapper instead.`,
    );
  }
}

function normalizeAppEnv(input?: string): AppEnv | null {
  if (!input) return null;

  const value = input.trim().toLowerCase();
  if (value === "dev" || value === "development") return "dev";
  if (value === "prod" || value === "production") return "prod";

  return null;
}

export function resolveAppEnv(): AppEnv {
  assertServerRuntime("resolveAppEnv");

  const explicitEnv = normalizeAppEnv(process.env.APP_ENV);
  if (explicitEnv) return explicitEnv;

  if (process.env.NODE_ENV === "development") return "dev";
  return "prod";
}

export function getDatabaseUrl(): string | undefined {
  assertServerRuntime("getDatabaseUrl");

  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const appEnv = resolveAppEnv();
  if (appEnv === "dev") {
    return process.env.DATABASE_URL_DEV ?? process.env.DATABASE_URL_PROD;
  }

  return process.env.DATABASE_URL_PROD ?? process.env.DATABASE_URL_DEV;
}

export function getDirectUrl(): string | undefined {
  assertServerRuntime("getDirectUrl");

  if (process.env.DIRECT_URL) return process.env.DIRECT_URL;

  const appEnv = resolveAppEnv();
  if (appEnv === "dev") {
    return process.env.DIRECT_URL_DEV ?? process.env.DIRECT_URL_PROD;
  }

  return process.env.DIRECT_URL_PROD ?? process.env.DIRECT_URL_DEV;
}

export function requireDatabaseUrl(context = "database"): string {
  assertServerRuntime("requireDatabaseUrl");

  const url = getDatabaseUrl();
  if (!url) {
    throw new Error(
      `Missing DATABASE_URL for ${context}. Set DATABASE_URL or DATABASE_URL_DEV/DATABASE_URL_PROD in .env.`,
    );
  }

  return url;
}

export function requireDirectUrl(context = "database"): string {
  assertServerRuntime("requireDirectUrl");

  const url = getDirectUrl();
  if (!url) {
    throw new Error(
      `Missing DIRECT_URL for ${context}. Set DIRECT_URL or DIRECT_URL_DEV/DIRECT_URL_PROD in .env.`,
    );
  }

  return url;
}
