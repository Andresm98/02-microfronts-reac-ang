import type { Request, Response } from "express";
import type { ClientesUseCases } from "../../application/index.js";
import { clienteBodySchema } from "./schemas.js";

type IdParams = { id: string };

/** Adaptador de entrada HTTP: traduce request/response ↔ casos de uso. */
export class ClientesController {
  constructor(private readonly useCases: ClientesUseCases) {}

  listar = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.useCases.listar.execute());
  };

  obtener = async (req: Request<IdParams>, res: Response): Promise<void> => {
    res.json(await this.useCases.obtener.execute(req.params.id));
  };

  crear = async (req: Request, res: Response): Promise<void> => {
    const body = clienteBodySchema.parse(req.body);
    const cliente = await this.useCases.crear.execute(body);
    res.status(201).location(`/api/clientes/${cliente.id}`).json(cliente);
  };

  actualizar = async (req: Request<IdParams>, res: Response): Promise<void> => {
    const body = clienteBodySchema.parse(req.body);
    res.json(await this.useCases.actualizar.execute(req.params.id, body));
  };

  eliminar = async (req: Request<IdParams>, res: Response): Promise<void> => {
    await this.useCases.eliminar.execute(req.params.id);
    res.status(204).end();
  };
}
