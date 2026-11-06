export interface LineaVenta {
  producto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Venta {
  id: string;
  clienteId: string;
  lineas: LineaVenta[];
  total: number;
  fecha: string;
}

export interface LineaVentaInput {
  producto: string;
  cantidad: number;
  precioUnitario: number;
}

export interface NuevaVenta {
  clienteId: string;
  lineas: LineaVentaInput[];
}

/** Resumen de cliente (solo lectura) que ventas necesita para el selector. */
export interface ClienteResumen {
  id: string;
  nombre: string;
  email: string;
}

export interface VentaValidationErrors {
  clienteId?: string;
  lineas?: string;
  /** errores por índice de línea */
  lineasDetalle?: Record<number, Partial<Record<keyof LineaVentaInput, string>>>;
}

const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function calcularSubtotal(linea: Pick<LineaVentaInput, 'cantidad' | 'precioUnitario'>): number {
  const cantidad = Number.isFinite(linea.cantidad) ? linea.cantidad : 0;
  const precio = Number.isFinite(linea.precioUnitario) ? linea.precioUnitario : 0;
  return redondear(cantidad * precio);
}

export function calcularTotal(lineas: Pick<LineaVentaInput, 'cantidad' | 'precioUnitario'>[]): number {
  return redondear(lineas.reduce((acc, l) => acc + calcularSubtotal(l), 0));
}

export function validarVenta(venta: NuevaVenta): VentaValidationErrors {
  const errors: VentaValidationErrors = {};
  if (!venta.clienteId) errors.clienteId = 'Selecciona un cliente.';
  if (venta.lineas.length === 0) errors.lineas = 'Añade al menos una línea.';
  const detalle: NonNullable<VentaValidationErrors['lineasDetalle']> = {};
  venta.lineas.forEach((l, i) => {
    const e: Partial<Record<keyof LineaVentaInput, string>> = {};
    if (!l.producto.trim()) e.producto = 'Producto obligatorio.';
    if (!Number.isInteger(l.cantidad) || l.cantidad <= 0) e.cantidad = 'Entero mayor que 0.';
    if (!Number.isFinite(l.precioUnitario) || l.precioUnitario < 0) e.precioUnitario = 'Precio ≥ 0.';
    if (Object.keys(e).length > 0) detalle[i] = e;
  });
  if (Object.keys(detalle).length > 0) errors.lineasDetalle = detalle;
  return errors;
}

export function tieneErrores(errors: VentaValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}
