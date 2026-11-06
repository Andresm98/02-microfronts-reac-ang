import { Cliente } from "../../domain/entities/Cliente.js";
import { EmailDuplicadoError } from "../../domain/errors.js";
import type { ClienteRepository } from "../../domain/ports/ClienteRepository.js";
import type { Clock, IdGenerator } from "../../domain/ports/IdGenerator.js";
import { type ClienteDTO, type ClienteInput, toClienteDTO } from "../dto/ClienteDTO.js";

export class CrearCliente {
  constructor(
    private readonly repo: ClienteRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: ClienteInput): Promise<ClienteDTO> {
    const cliente = Cliente.crear(this.ids.next(), input, this.clock.now());

    const existente = await this.repo.findByEmail(cliente.email.value);
    if (existente) throw new EmailDuplicadoError(cliente.email.value);

    await this.repo.create(cliente);
    return toClienteDTO(cliente);
  }
}
