import { Venta, type VentaPrimitives } from "../../domain/entities/Venta.js";
import type { FiltroVentas, VentaRepository } from "../../domain/ports/VentaRepository.js";

/** Adaptador en memoria (tests y desarrollo sin base de datos). */
export class InMemoryVentaRepository implements VentaRepository {
  private readonly store = new Map<string, VentaPrimitives>();

  async save(venta: Venta): Promise<void> {
    this.store.set(venta.id, structuredClone(venta.toPrimitives()));
  }

  async findById(id: string): Promise<Venta | null> {
    const p = this.store.get(id);
    return p ? Venta.reconstituir(structuredClone(p)) : null;
  }

  async findAll(filtro: FiltroVentas = {}): Promise<Venta[]> {
    return [...this.store.values()]
      .filter((p) => !filtro.clienteId || p.clienteId === filtro.clienteId)
      .sort((a, b) => b.fecha.getTime() - a.fecha.getTime() || a.id.localeCompare(b.id))
      .map((p) => Venta.reconstituir(structuredClone(p)));
  }
}
