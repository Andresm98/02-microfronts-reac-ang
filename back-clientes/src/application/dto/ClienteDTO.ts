import type { Cliente } from "../../domain/entities/Cliente.js";

/** Representación pública de un cliente (contrato `Cliente` de CONTRACTS.md). */
export interface ClienteDTO {
  id: string;
  nombre: string;
  email: string;
  documento: string;
  telefono: string | null;
  creadoEn: string;
}

/** Datos de entrada para crear o actualizar un cliente. */
export interface ClienteInput {
  nombre: string;
  email: string;
  documento: string;
  telefono?: string | null;
}

export function toClienteDTO(cliente: Cliente): ClienteDTO {
  const p = cliente.toPrimitives();
  return {
    id: p.id,
    nombre: p.nombre,
    email: p.email,
    documento: p.documento,
    telefono: p.telefono,
    creadoEn: p.creadoEn.toISOString(),
  };
}
