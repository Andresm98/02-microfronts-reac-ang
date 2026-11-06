import type { Cliente, ClienteInput } from './Cliente';

/** Puerto de salida: cualquier implementación (HTTP, memoria...) debe cumplirlo. */
export interface ClienteGateway {
  listar(): Promise<Cliente[]>;
  crear(input: ClienteInput): Promise<Cliente>;
  actualizar(id: string, input: ClienteInput): Promise<Cliente>;
  eliminar(id: string): Promise<void>;
}
