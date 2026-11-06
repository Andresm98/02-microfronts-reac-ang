import { randomUUID } from "node:crypto";
import pg from "pg";
import { createApp } from "./app.js";
import { buildClientesUseCases } from "./application/index.js";
import { loadEnv } from "./infrastructure/config/env.js";
import { PostgresClienteRepository } from "./infrastructure/persistence/PostgresClienteRepository.js";

/** Composition root: conecta adaptadores reales y arranca el servidor. */
async function main(): Promise<void> {
  const env = loadEnv();

  const pool = new pg.Pool({ connectionString: env.databaseUrl, max: 10 });
  pool.on("error", (err) => console.error("[back-clientes] Error en el pool de Postgres:", err.message));

  const repo = new PostgresClienteRepository(pool);
  const useCases = buildClientesUseCases(
    repo,
    { next: () => randomUUID() },
    { now: () => new Date() },
  );

  const app = createApp({ useCases, corsOrigins: env.corsOrigins });
  const server = app.listen(env.port, () => {
    console.log(`[back-clientes] Escuchando en http://localhost:${env.port}`);
  });

  let closing = false;
  const shutdown = (signal: string) => {
    if (closing) return;
    closing = true;
    console.log(`[back-clientes] ${signal} recibido, cerrando...`);
    const force = setTimeout(() => process.exit(1), 10_000);
    force.unref();
    server.close(async () => {
      await pool.end().catch(() => undefined);
      console.log("[back-clientes] Cerrado correctamente");
      process.exit(0);
    });
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("[back-clientes] Error fatal al arrancar:", err);
  process.exit(1);
});
