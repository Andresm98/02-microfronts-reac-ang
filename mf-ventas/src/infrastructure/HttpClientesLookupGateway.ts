import type { ClienteResumen, ClientesLookupGateway } from '../domain';
import { defaultFetch, requestJson, trimBase, type FetchFn } from './http';

interface ClienteDto {
  id: string;
  nombre: string;
  email: string;
}

/** Lee clientes de back-clientes (GET /api/clientes) para el selector. */
export class HttpClientesLookupGateway implements ClientesLookupGateway {
  private readonly url: string;
  private readonly fetchFn: FetchFn;

  constructor(baseUrl: string, fetchFn: FetchFn = defaultFetch) {
    this.url = `${trimBase(baseUrl)}/api/clientes`;
    this.fetchFn = fetchFn;
  }

  async listar(): Promise<ClienteResumen[]> {
    const data = await requestJson<ClienteDto[]>(this.fetchFn, this.url, {}, 'clientes');
    return data.map(({ id, nombre, email }) => ({ id, nombre, email }));
  }
}
