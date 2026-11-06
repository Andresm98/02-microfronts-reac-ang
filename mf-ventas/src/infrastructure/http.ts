import { VentaError } from '../domain';

export type FetchFn = typeof fetch;

export const defaultFetch: FetchFn = (input, init) => fetch(input, init);

export function trimBase(url: string): string {
  return url.replace(/\/+$/, '');
}

/** Petición JSON que traduce errores HTTP/red a VentaError. */
export async function requestJson<T>(fetchFn: FetchFn, url: string, init: RequestInit = {}, servicio = 'ventas'): Promise<T> {
  let res: Response;
  try {
    res = await fetchFn(url, {
      ...init,
      headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
    });
  } catch (e) {
    throw new VentaError('network', `No se pudo conectar con el servicio de ${servicio}.`, e);
  }
  if (res.status === 204) return undefined as T;
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = body as { error?: string; details?: unknown } | null;
    const msg = err?.error ?? `Error HTTP ${res.status}`;
    if (res.status === 400) throw new VentaError('validation', msg, err?.details);
    if (res.status === 404) throw new VentaError('not-found', msg, err?.details);
    throw new VentaError('unknown', msg, err?.details);
  }
  return body as T;
}
