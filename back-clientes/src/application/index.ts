import { ActualizarCliente } from "./use-cases/ActualizarCliente.js";
import { CrearCliente } from "./use-cases/CrearCliente.js";
import { EliminarCliente } from "./use-cases/EliminarCliente.js";
import { ListarClientes } from "./use-cases/ListarClientes.js";
import { ObtenerCliente } from "./use-cases/ObtenerCliente.js";
import type { ClienteRepository } from "../domain/ports/ClienteRepository.js";
import type { Clock, IdGenerator } from "../domain/ports/IdGenerator.js";

export { ActualizarCliente, CrearCliente, EliminarCliente, ListarClientes, ObtenerCliente };
export type { ClienteDTO, ClienteInput } from "./dto/ClienteDTO.js";

/** Conjunto de casos de uso que consume la capa HTTP. */
export interface ClientesUseCases {
  crear: CrearCliente;
  listar: ListarClientes;
  obtener: ObtenerCliente;
  actualizar: ActualizarCliente;
  eliminar: EliminarCliente;
}

export function buildClientesUseCases(
  repo: ClienteRepository,
  ids: IdGenerator,
  clock: Clock,
): ClientesUseCases {
  return {
    crear: new CrearCliente(repo, ids, clock),
    listar: new ListarClientes(repo),
    obtener: new ObtenerCliente(repo),
    actualizar: new ActualizarCliente(repo),
    eliminar: new EliminarCliente(repo),
  };
}
