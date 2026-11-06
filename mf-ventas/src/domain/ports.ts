import type { ClienteResumen, NuevaVenta, Venta } from './Venta';

/** Puerto de salida hacia el servicio de ventas. */
export interface VentaGateway {
  listar(clienteId?: string): Promise<Venta[]>;
  crear(venta: NuevaVenta): Promise<Venta>;
}

/** Puerto de solo lectura hacia el servicio de clientes (selector). */
export interface ClientesLookupGateway {
  listar(): Promise<ClienteResumen[]>;
}
