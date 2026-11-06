import type { Request, Response } from "express";
import type { VentasUseCases } from "../../application/index.js";
import { listarQuerySchema, registrarVentaSchema } from "./schemas.js";

type IdParams = { id: string };

/** Adaptador de entrada HTTP: traduce request/response ↔ casos de uso. */
export class VentasController {
  constructor(private readonly useCases: VentasUseCases) {}

  listar = async (req: Request, res: Response): Promise<void> => {
    const { clienteId } = listarQuerySchema.parse(req.query);
    res.json(await this.useCases.listar.execute({ clienteId }));
  };

  obtener = async (req: Request<IdParams>, res: Response): Promise<void> => {
    res.json(await this.useCases.obtener.execute(req.params.id));
  };

  registrar = async (req: Request, res: Response): Promise<void> => {
    const body = registrarVentaSchema.parse(req.body);
    const venta = await this.useCases.registrar.execute(body);
    res.status(201).location(`/api/ventas/${venta.id}`).json(venta);
  };
}
