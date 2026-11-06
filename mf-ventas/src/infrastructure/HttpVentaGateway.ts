import type { NuevaVenta, Venta, VentaGateway } from '../domain';
import { defaultFetch, requestJson, trimBase, type FetchFn } from './http';

export class HttpVentaGateway implements VentaGateway {
  private readonly baseUrl: string;
  private readonly fetchFn: FetchFn;

  constructor(baseUrl: string, fetchFn: FetchFn = defaultFetch) {
    this.baseUrl = `${trimBase(baseUrl)}/api/ventas`;
    this.fetchFn = fetchFn;
  }

  listar(clienteId?: string): Promise<Venta[]> {
    const qs = clienteId ? `?clienteId=${encodeURIComponent(clienteId)}` : '';
    return requestJson<Venta[]>(this.fetchFn, `${this.baseUrl}${qs}`);
  }

  crear(venta: NuevaVenta): Promise<Venta> {
    return requestJson<Venta>(this.fetchFn, this.baseUrl, { method: 'POST', body: JSON.stringify(venta) });
  }
}
