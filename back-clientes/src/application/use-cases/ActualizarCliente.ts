import { ClienteNoEncontradoError, EmailDuplicadoError } from "../../domain/errors.js";
import type { ClienteRepository } from "../../domain/ports/ClienteRepository.js";
import { type ClienteDTO, type ClienteInput, toClienteDTO } from "../dto/ClienteDTO.js";

export class ActualizarCliente {
  constructor(private readonly repo: ClienteRepository) {}

  async execute(id: string, input: ClienteInput): Promise<ClienteDTO> {
    const cliente = await this.repo.findById(id);
    if (!cliente) throw new ClienteNoEncontradoError(id);

    cliente.actualizar(input);

    const conMismoEmail = await this.repo.findByEmail(cliente.email.value);
    if (conMismoEmail && conMismoEmail.id !== cliente.id) {
      throw new EmailDuplicadoError(cliente.email.value);
    }

    await this.repo.update(cliente);
    return toClienteDTO(cliente);
  }
}
