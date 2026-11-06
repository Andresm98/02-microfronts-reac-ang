import {
  CalcularTotalPreview,
  ListarClientesLookup,
  ListarVentas,
  RegistrarVenta,
  type VentasUseCases,
} from './application/ventasUseCases';
import type { ClientesLookupGateway, VentaGateway } from './domain';
import { HttpClientesLookupGateway } from './infrastructure/HttpClientesLookupGateway';
import { HttpVentaGateway } from './infrastructure/HttpVentaGateway';

export const API_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:3002';
export const CLIENTES_API_URL: string = import.meta.env.VITE_CLIENTES_API_URL || 'http://localhost:3001';

/** Composition root: conecta gateways (infraestructura) con casos de uso (aplicación). */
export function createUseCases(
  ventas: VentaGateway = new HttpVentaGateway(API_URL),
  clientes: ClientesLookupGateway = new HttpClientesLookupGateway(CLIENTES_API_URL),
): VentasUseCases {
  return {
    listarVentas: new ListarVentas(ventas),
    registrarVenta: new RegistrarVenta(ventas),
    calcularTotalPreview: new CalcularTotalPreview(),
    listarClientes: new ListarClientesLookup(clientes),
  };
}
