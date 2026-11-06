import {
  calcularSubtotal,
  calcularTotal,
  type ClienteResumen,
  type ClientesLookupGateway,
  type NuevaVenta,
  type Venta,
  type VentaGateway,
} from '../src/domain';

export class FakeVentaGateway implements VentaGateway {
  ventas: Venta[];
  listarCalls: (string | undefined)[] = [];
  creadas: NuevaVenta[] = [];
  private seq = 0;

  constructor(initial: Venta[] = []) {
    this.ventas = [...initial];
  }

  async listar(clienteId?: string): Promise<Venta[]> {
    this.listarCalls.push(clienteId);
    return this.ventas.filter((v) => !clienteId || v.clienteId === clienteId);
  }

  async crear(nueva: NuevaVenta): Promise<Venta> {
    this.creadas.push(nueva);
    const venta: Venta = {
      id: `v${++this.seq}`,
      clienteId: nueva.clienteId,
      lineas: nueva.lineas.map((l) => ({ ...l, subtotal: calcularSubtotal(l) })),
      total: calcularTotal(nueva.lineas),
      fecha: new Date(2026, 0, this.seq).toISOString(),
    };
    this.ventas.push(venta);
    return venta;
  }
}

export class FakeClientesLookup implements ClientesLookupGateway {
  constructor(public clientes: ClienteResumen[] = []) {}
  async listar(): Promise<ClienteResumen[]> {
    return [...this.clientes];
  }
}

export function makeVenta(over: Partial<Venta> = {}): Venta {
  return {
    id: 'v-' + Math.random().toString(36).slice(2),
    clienteId: 'c1',
    lineas: [{ producto: 'Café', cantidad: 2, precioUnitario: 1.5, subtotal: 3 }],
    total: 3,
    fecha: '2026-01-01T10:00:00.000Z',
    ...over,
  };
}
