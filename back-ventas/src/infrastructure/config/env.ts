export interface Env {
  port: number;
  mongoUrl: string;
  mongoDb: string;
  corsOrigins: string[];
}

const DEFAULTS = {
  PORT: "3002",
  MONGO_URL: "mongodb://localhost:27017",
  MONGO_DB: "ventas",
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
    mongoUrl: source.MONGO_URL || DEFAULTS.MONGO_URL,
    mongoDb: source.MONGO_DB || DEFAULTS.MONGO_DB,
    corsOrigins: parseOrigins(source.CORS_ORIGINS || DEFAULTS.CORS_ORIGINS),
  };
}
