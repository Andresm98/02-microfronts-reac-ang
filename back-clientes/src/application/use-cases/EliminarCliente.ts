import { ClienteNoEncontradoError } from "../../domain/errors.js";
import type { ClienteRepository } from "../../domain/ports/ClienteRepository.js";

export class EliminarCliente {
  constructor(private readonly repo: ClienteRepository) {}

  async execute(id: string): Promise<void> {
    const eliminado = await this.repo.delete(id);
    if (!eliminado) throw new ClienteNoEncontradoError(id);
  }
}
