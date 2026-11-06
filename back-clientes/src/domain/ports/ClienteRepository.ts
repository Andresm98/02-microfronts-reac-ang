import type { Cliente } from "../entities/Cliente.js";

/**
 * Puerto de salida para persistir clientes.
 * `create`/`update` deben lanzar `EmailDuplicadoError` si el email ya existe
 * (defensa ante condiciones de carrera además del chequeo del caso de uso).
 */
export interface ClienteRepository {
  findAll(): Promise<Cliente[]>;
  findById(id: string): Promise<Cliente | null>;
  findByEmail(email: string): Promise<Cliente | null>;
  create(cliente: Cliente): Promise<void>;
  update(cliente: Cliente): Promise<void>;
  /** Devuelve `true` si se eliminó, `false` si no existía. */
  delete(id: string): Promise<boolean>;
}
