import cors from "cors";
import express, { type Express } from "express";
import type { VentasUseCases } from "./application/index.js";
import { errorHandler, notFoundHandler } from "./infrastructure/http/errorHandler.js";
import { ventasRouter } from "./infrastructure/http/routes.js";

export interface AppOptions {
  useCases: VentasUseCases;
  /** Orígenes CORS permitidos. Vacío = cualquier origen. */
  corsOrigins?: string[];
}

/** Construye la app Express con los casos de uso inyectados (sin conocer la BD). */
export function createApp({ useCases, corsOrigins = [] }: AppOptions): Express {
  const app = express();
  app.disable("x-powered-by");

  app.use(cors({ origin: corsOrigins.length > 0 ? corsOrigins : true }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/ventas", ventasRouter(useCases));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
