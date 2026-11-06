import type { Venta } from "../../domain/entities/Venta.js";

/** Contrato `LineaVenta` de CONTRACTS.md. */
export interface LineaVentaDTO {
  producto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

/** Contrato `Venta` de CONTRACTS.md. */
export interface VentaDTO {
  id: string;
  clienteId: string;
  lineas: LineaVentaDTO[];
  total: number;
  fecha: string;
}

export interface RegistrarVentaInput {
  clienteId: string;
  lineas: { producto: string; cantidad: number; precioUnitario: number }[];
}

export function toVentaDTO(venta: Venta): VentaDTO {
  const p = venta.toPrimitives();
  return { id: p.id, clienteId: p.clienteId, lineas: p.lineas, total: p.total, fecha: p.fecha.toISOString() };
}
