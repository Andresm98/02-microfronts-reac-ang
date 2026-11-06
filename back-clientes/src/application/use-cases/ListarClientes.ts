import type { ClienteRepository } from "../../domain/ports/ClienteRepository.js";
import { type ClienteDTO, toClienteDTO } from "../dto/ClienteDTO.js";

export class ListarClientes {
  constructor(private readonly repo: ClienteRepository) {}

  async execute(): Promise<ClienteDTO[]> {
    const clientes = await this.repo.findAll();
    return clientes.map(toClienteDTO);
  }
}
