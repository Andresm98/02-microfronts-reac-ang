import {
  calcularSubtotal,
  calcularTotal,
  tieneErrores,
  validarVenta,
  VentaError,
  type ClienteResumen,
  type ClientesLookupGateway,
  type LineaVentaInput,
  type NuevaVenta,
  type Venta,
  type VentaGateway,
} from '../domain';

export class ListarVentas {
  constructor(private readonly gateway: VentaGateway) {}
  /** Lista ventas (más recientes primero), opcionalmente filtradas por cliente. */
  async execute(clienteId?: string): Promise<Venta[]> {
    const ventas = await this.gateway.listar(clienteId || undefined);
    return [...ventas].sort((a, b) => b.fecha.localeCompare(a.fecha));
  }
}

export class RegistrarVenta {
  constructor(private readonly gateway: VentaGateway) {}
  async execute(venta: NuevaVenta): Promise<Venta> {
    const normalizada: NuevaVenta = {
      clienteId: venta.clienteId,
      lineas: venta.lineas.map((l) => ({
        producto: l.producto.trim(),
        cantidad: Number(l.cantidad),
        precioUnitario: Number(l.precioUnitario),
      })),
    };
    const errors = validarVenta(normalizada);
    if (tieneErrores(errors)) throw new VentaError('validation', 'Revisa los datos de la venta.', errors);
    return this.gateway.crear(normalizada);
  }
}

export interface TotalPreview {
  subtotales: number[];
  total: number;
}

/** Previsualización del total en vivo (el total definitivo lo calcula el backend). */
export class CalcularTotalPreview {
  execute(lineas: Pick<LineaVentaInput, 'cantidad' | 'precioUnitario'>[]): TotalPreview {
    return { subtotales: lineas.map(calcularSubtotal), total: calcularTotal(lineas) };
  }
}

export class ListarClientesLookup {
  constructor(private readonly gateway: ClientesLookupGateway) {}
  async execute(): Promise<ClienteResumen[]> {
    const clientes = await this.gateway.listar();
    return [...clientes].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }
}

export interface VentasUseCases {
  listarVentas: ListarVentas;
  registrarVenta: RegistrarVenta;
  calcularTotalPreview: CalcularTotalPreview;
  listarClientes: ListarClientesLookup;
}
