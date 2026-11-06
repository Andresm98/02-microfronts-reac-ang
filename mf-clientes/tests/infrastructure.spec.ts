import { describe, expect, it, vi } from 'vitest';
import { HttpClienteGateway } from '../src/infrastructure/HttpClienteGateway';
import {
  CLIENTE_SELECCIONADO,
  publish,
  publishClienteSeleccionado,
  subscribe,
  VENTA_CREADA,
} from '../src/infrastructure/events/mfEvents';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('eventos cross-micro', () => {
  it('publishClienteSeleccionado emite clientes:seleccionado en window', () => {
    const handler = vi.fn();
    const off = subscribe(CLIENTE_SELECCIONADO, handler);
    publishClienteSeleccionado({ id: 'c1', nombre: 'Ana' });
    expect(handler).toHaveBeenCalledWith({ id: 'c1', nombre: 'Ana' });
    off();
    publishClienteSeleccionado({ id: 'c2', nombre: 'Luis' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('subscribe recibe el detail tipado y usa CustomEvent', () => {
    const received: unknown[] = [];
    const raw = vi.fn();
    window.addEventListener(VENTA_CREADA, raw);
    const off = subscribe(VENTA_CREADA, (d) => received.push(d));
    publish(VENTA_CREADA, { id: 'v1', clienteId: 'c1', total: 10 });
    expect(received).toEqual([{ id: 'v1', clienteId: 'c1', total: 10 }]);
    expect(raw.mock.calls[0][0]).toBeInstanceOf(CustomEvent);
    off();
    window.removeEventListener(VENTA_CREADA, raw);
  });
});

describe('HttpClienteGateway', () => {
  it('construye las URLs a partir de la base y hace POST con JSON', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(201, { id: '1' }));
    const gw = new HttpClienteGateway('http://api:3001/', fetchFn);
    await gw.crear({ nombre: 'A', email: 'a@a.com', documento: '1' });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://api:3001/api/clientes');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ nombre: 'A', email: 'a@a.com', documento: '1' });
  });

  it('traduce 409 a error de duplicado', async () => {
    const gw = new HttpClienteGateway('http://api', async () => jsonResponse(409, { error: 'email duplicado' }));
    await expect(gw.crear({ nombre: 'A', email: 'a@a.com', documento: '1' })).rejects.toMatchObject({ kind: 'duplicate' });
  });

  it('acepta 204 en DELETE y traduce fallos de red', async () => {
    const ok = new HttpClienteGateway('http://api', async () => new Response(null, { status: 204 }));
    await expect(ok.eliminar('x')).resolves.toBeUndefined();
    const down = new HttpClienteGateway('http://api', async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(down.listar()).rejects.toMatchObject({ kind: 'network' });
  });
});
