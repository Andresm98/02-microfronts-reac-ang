import { describe, expect, it, vi } from 'vitest';
import { HttpClientesLookupGateway } from '../src/infrastructure/HttpClientesLookupGateway';
import { HttpVentaGateway } from '../src/infrastructure/HttpVentaGateway';
import {
  CLIENTE_SELECCIONADO,
  onClienteSeleccionado,
  publish,
  publishVentaCreada,
  subscribe,
  VENTA_CREADA,
} from '../src/infrastructure/events/mfEvents';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('eventos cross-micro', () => {
  it('publishVentaCreada emite ventas:creada con el detail del contrato', () => {
    const handler = vi.fn();
    const off = subscribe(VENTA_CREADA, handler);
    publishVentaCreada({ id: 'v1', clienteId: 'c1', total: 12.5 });
    expect(handler).toHaveBeenCalledWith({ id: 'v1', clienteId: 'c1', total: 12.5 });
    off();
  });

  it('onClienteSeleccionado recibe eventos y se puede desuscribir', () => {
    const handler = vi.fn();
    const off = onClienteSeleccionado(handler);
    window.dispatchEvent(new CustomEvent(CLIENTE_SELECCIONADO, { detail: { id: 'c1', nombre: 'Ana' } }));
    off();
    publish(CLIENTE_SELECCIONADO, { id: 'c2', nombre: 'Luis' });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ id: 'c1', nombre: 'Ana' });
  });
});

describe('gateways HTTP', () => {
  it('HttpVentaGateway añade ?clienteId= al listar', async () => {
    const fetchFn = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => json(200, []));
    await new HttpVentaGateway('http://api:3002/', fetchFn).listar('a b');
    expect(fetchFn.mock.calls[0][0]).toBe('http://api:3002/api/ventas?clienteId=a%20b');
  });

  it('HttpVentaGateway hace POST y traduce 400 a validación', async () => {
    const fetchFn = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => json(400, { error: 'lineas requeridas' }));
    const gw = new HttpVentaGateway('http://api', fetchFn);
    await expect(gw.crear({ clienteId: 'c1', lineas: [] })).rejects.toMatchObject({
      kind: 'validation',
      message: 'lineas requeridas',
    });
    expect(fetchFn.mock.calls[0][1]?.method).toBe('POST');
  });

  it('HttpClientesLookupGateway lee /api/clientes y proyecta el resumen', async () => {
    const fetchFn = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      json(200, [{ id: '1', nombre: 'Ana', email: 'a@a.com', documento: 'x', telefono: null, creadoEn: '' }]),
    );
    const res = await new HttpClientesLookupGateway('http://cli:3001', fetchFn).listar();
    expect(fetchFn.mock.calls[0][0]).toBe('http://cli:3001/api/clientes');
    expect(res).toEqual([{ id: '1', nombre: 'Ana', email: 'a@a.com' }]);
  });

  it('traduce fallos de red', async () => {
    const gw = new HttpVentaGateway('http://api', async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(gw.listar()).rejects.toMatchObject({ kind: 'network' });
  });
});
