import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { ConflictError, NotFoundError, ValidationError } from "../../domain/errors.js";

/** Cuerpo de error del contrato: `{ error: string, details?: unknown }`. */
export interface ErrorBody {
  error: string;
  details?: unknown;
}

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` } satisfies ErrorBody);
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Datos inválidos",
      details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    } satisfies ErrorBody);
    return;
  }
  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message } satisfies ErrorBody);
    return;
  }
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message } satisfies ErrorBody);
    return;
  }
  if (err instanceof ConflictError) {
    res.status(409).json({ error: err.message } satisfies ErrorBody);
    return;
  }
  // Errores de body-parser (JSON malformado, payload demasiado grande...)
  const status = (err as { status?: number; statusCode?: number })?.status ?? (err as { statusCode?: number })?.statusCode;
  if (typeof status === "number" && status >= 400 && status < 500) {
    const type = (err as { type?: string }).type;
    res.status(status).json({
      error: type === "entity.parse.failed" ? "JSON inválido" : String((err as Error).message ?? "Petición inválida"),
    } satisfies ErrorBody);
    return;
  }

  console.error("[back-clientes] Error no controlado:", err);
  res.status(500).json({ error: "Error interno del servidor" } satisfies ErrorBody);
};
