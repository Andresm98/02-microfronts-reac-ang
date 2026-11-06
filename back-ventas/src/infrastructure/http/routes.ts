import { Router } from "express";
import type { VentasUseCases } from "../../application/index.js";
import { VentasController } from "./VentasController.js";

export function ventasRouter(useCases: VentasUseCases): Router {
  const controller = new VentasController(useCases);
  const router = Router();

  router.get("/", controller.listar);
  router.post("/", controller.registrar);
  router.get("/:id", controller.obtener);

  return router;
}
