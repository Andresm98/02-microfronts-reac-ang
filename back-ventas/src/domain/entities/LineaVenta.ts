import { ValidationError } from "../errors.js";
import { Money } from "../value-objects/Money.js";

export interface DatosLinea {
  producto: string;
  cantidad: number;
  precioUnitario: number;
}

export interface LineaVentaPrimitives extends DatosLinea {
  subtotal: number;
}

const MAX_PRODUCTO = 200;

/** Línea de venta (value object): el subtotal se calcula, nunca se recibe. */
export class LineaVenta {
  private constructor(
    readonly producto: string,
    readonly cantidad: number,
    readonly precioUnitario: Money,
    readonly subtotal: Money,
  ) {}

  static crear(datos: DatosLinea): LineaVenta {
    const producto = (datos.producto ?? "").trim();
    if (!producto) throw new ValidationError("El producto es obligatorio");
    if (producto.length > MAX_PRODUCTO) {
      throw new ValidationError(`El producto no puede superar ${MAX_PRODUCTO} caracteres`);
    }
    if (!Number.isInteger(datos.cantidad) || datos.cantidad <= 0) {
      throw new ValidationError(`La cantidad de '${producto}' debe ser un entero positivo`);
    }
    const precio = Money.of(datos.precioUnitario, `El precioUnitario de '${producto}'`);
    return new LineaVenta(producto, datos.cantidad, precio, precio.multiply(datos.cantidad));
  }

  toPrimitives(): LineaVentaPrimitives {
    return {
      producto: this.producto,
      cantidad: this.cantidad,
      precioUnitario: this.precioUnitario.amount,
      subtotal: this.subtotal.amount,
    };
  }
}
