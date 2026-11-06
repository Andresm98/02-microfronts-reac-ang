import type { Venta } from "../entities/Venta.js";

export interface FiltroVentas {
  clienteId?: string;
}

/** Puerto de salida para persistir ventas. */
export interface VentaRepository {
  save(venta: Venta): Promise<void>;
  findById(id: string): Promise<Venta | null>;
  /** Ventas ordenadas por fecha descendente, opcionalmente filtradas por cliente. */
  findAll(filtro?: FiltroVentas): Promise<Venta[]>;
}
