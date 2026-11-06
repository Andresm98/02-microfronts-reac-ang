export interface Env {
  port: number;
  databaseUrl: string;
  corsOrigins: string[];
}

const DEFAULTS = {
  PORT: "3001",
  DATABASE_URL: "postgres://clientes:clientes@localhost:5432/clientes",
  CORS_ORIGINS: "http://localhost:5000,http://localhost:5001,http://localhost:5002",
};

export function parseOrigins(raw: string): string[] {
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const port = Number(source.PORT || DEFAULTS.PORT);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`PORT inválido: ${source.PORT}`);
  }
  return {
    port,
    databaseUrl: source.DATABASE_URL || DEFAULTS.DATABASE_URL,
    corsOrigins: parseOrigins(source.CORS_ORIGINS || DEFAULTS.CORS_ORIGINS),
  };
}
