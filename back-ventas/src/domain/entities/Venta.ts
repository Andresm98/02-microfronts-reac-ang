import { ValidationError } from "../errors.js";
import { Money } from "../value-objects/Money.js";
import { type DatosLinea, LineaVenta, type LineaVentaPrimitives } from "./LineaVenta.js";

export interface DatosVenta {
  clienteId: string;
  lineas: DatosLinea[];
}

export interface VentaPrimitives {
  id: string;
  clienteId: string;
  lineas: LineaVentaPrimitives[];
  total: number;
  fecha: Date;
}

/** Agregado Venta: valida líneas y calcula el total a partir de los subtotales. */
export class Venta {
  readonly total: Money;

  private constructor(
    readonly id: string,
    readonly clienteId: string,
    readonly lineas: readonly LineaVenta[],
    readonly fecha: Date,
  ) {
    this.total = lineas.reduce((acc, l) => acc.add(l.subtotal), Money.ZERO);
  }

  static registrar(id: string, datos: DatosVenta, fecha: Date = new Date()): Venta {
    if (!id?.trim()) throw new ValidationError("El id es obligatorio");
    const clienteId = (datos.clienteId ?? "").trim();
    if (!clienteId) throw new ValidationError("El clienteId es obligatorio");
    if (!Array.isArray(datos.lineas) || datos.lineas.length === 0) {
      throw new ValidationError("La venta debe tener al menos una línea");
    }
    return new Venta(id, clienteId, datos.lineas.map((l) => LineaVenta.crear(l)), fecha);
  }

  /** Reconstruye desde persistencia (recalcula subtotales/total con las mismas reglas). */
  static reconstituir(p: VentaPrimitives): Venta {
    return Venta.registrar(p.id, p, p.fecha);
  }

  toPrimitives(): VentaPrimitives {
    return {
      id: this.id,
      clienteId: this.clienteId,
      lineas: this.lineas.map((l) => l.toPrimitives()),
      total: this.total.amount,
      fecha: this.fecha,
    };
  }
}
