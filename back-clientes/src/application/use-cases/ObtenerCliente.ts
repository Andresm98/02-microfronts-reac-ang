import { ClienteNoEncontradoError } from "../../domain/errors.js";
import type { ClienteRepository } from "../../domain/ports/ClienteRepository.js";
import { type ClienteDTO, toClienteDTO } from "../dto/ClienteDTO.js";

export class ObtenerCliente {
  constructor(private readonly repo: ClienteRepository) {}

  async execute(id: string): Promise<ClienteDTO> {
    const cliente = await this.repo.findById(id);
    if (!cliente) throw new ClienteNoEncontradoError(id);
    return toClienteDTO(cliente);
  }
}
