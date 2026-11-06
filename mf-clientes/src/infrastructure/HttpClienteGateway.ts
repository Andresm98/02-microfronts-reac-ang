import { ClienteError, type Cliente, type ClienteGateway, type ClienteInput } from '../domain';

type FetchFn = typeof fetch;

export class HttpClienteGateway implements ClienteGateway {
  private readonly baseUrl: string;
  private readonly fetchFn: FetchFn;

  constructor(baseUrl: string, fetchFn?: FetchFn) {
    this.baseUrl = `${baseUrl.replace(/\/+$/, '')}/api/clientes`;
    this.fetchFn = fetchFn ?? ((input, init) => fetch(input, init));
  }

  listar(): Promise<Cliente[]> {
    return this.request<Cliente[]>('');
  }

  crear(input: ClienteInput): Promise<Cliente> {
    return this.request<Cliente>('', { method: 'POST', body: JSON.stringify(input) });
  }

  actualizar(id: string, input: ClienteInput): Promise<Cliente> {
    return this.request<Cliente>(`/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  async eliminar(id: string): Promise<void> {
    await this.request<void>(`/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let res: Response;
    try {
      res = await this.fetchFn(`${this.baseUrl}${path}`, {
        ...init,
        headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
      });
    } catch (e) {
      throw new ClienteError('network', 'No se pudo conectar con el servicio de clientes.', e);
    }
    if (res.status === 204) return undefined as T;
    const body: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const err = body as { error?: string; details?: unknown } | null;
      const msg = err?.error ?? `Error HTTP ${res.status}`;
      switch (res.status) {
        case 400:
          throw new ClienteError('validation', msg, err?.details);
        case 404:
          throw new ClienteError('not-found', 'El cliente no existe.', err?.details);
        case 409:
          throw new ClienteError('duplicate', 'Ya existe un cliente con ese email.', err?.details);
        default:
          throw new ClienteError('unknown', msg, err?.details);
      }
    }
    return body as T;
  }
}
