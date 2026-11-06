import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";
import { createApp } from "./app.js";
import { buildVentasUseCases } from "./application/index.js";
import { loadEnv } from "./infrastructure/config/env.js";
import { MongoVentaRepository } from "./infrastructure/persistence/MongoVentaRepository.js";

/** Composition root: conecta adaptadores reales y arranca el servidor. */
async function main(): Promise<void> {
  const env = loadEnv();

  // El driver conecta de forma perezosa en la primera operación, así el API
  // arranca aunque Mongo aún no esté listo (las peticiones fallarán con 500 mientras tanto).
  const client = new MongoClient(env.mongoUrl, { serverSelectionTimeoutMS: 5_000 });
  const repo = new MongoVentaRepository(client.db(env.mongoDb));
  repo
    .ensureIndexes()
    .then(() => console.log(`[back-ventas] Conectado a MongoDB (${env.mongoDb})`))
    .catch((err: Error) => console.warn("[back-ventas] No se pudieron crear índices:", err.message));

  const useCases = buildVentasUseCases(repo, { next: () => randomUUID() }, { now: () => new Date() });

  const app = createApp({ useCases, corsOrigins: env.corsOrigins });
  const server = app.listen(env.port, () => {
    console.log(`[back-ventas] Escuchando en http://localhost:${env.port}`);
  });

  let closing = false;
  const shutdown = (signal: string) => {
    if (closing) return;
    closing = true;
    console.log(`[back-ventas] ${signal} recibido, cerrando...`);
    const force = setTimeout(() => process.exit(1), 10_000);
    force.unref();
    server.close(async () => {
      await client.close().catch(() => undefined);
      console.log("[back-ventas] Cerrado correctamente");
      process.exit(0);
    });
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("[back-ventas] Error fatal al arrancar:", err);
  process.exit(1);
});
