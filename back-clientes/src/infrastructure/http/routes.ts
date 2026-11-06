import { Router } from "express";
import type { ClientesUseCases } from "../../application/index.js";
import { ClientesController } from "./ClientesController.js";

export function clientesRouter(useCases: ClientesUseCases): Router {
  const controller = new ClientesController(useCases);
  const router = Router();

  router.get("/", controller.listar);
  router.post("/", controller.crear);
  router.get("/:id", controller.obtener);
  router.put("/:id", controller.actualizar);
  router.delete("/:id", controller.eliminar);

  return router;
}
