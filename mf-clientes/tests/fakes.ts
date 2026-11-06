import { ClienteError, type Cliente, type ClienteGateway, type ClienteInput } from '../src/domain';

export function makeCliente(over: Partial<Cliente> = {}): Cliente {
  return {
    id: over.id ?? crypto.randomUUID(),
    nombre: 'Ana Pérez',
    email: 'ana@correo.com',
    documento: '123',
    telefono: null,
    creadoEn: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

/** Gateway en memoria que reproduce las reglas del backend (409 por email duplicado). */
export class FakeClienteGateway implements ClienteGateway {
  clientes: Cliente[];
  calls: string[] = [];

  constructor(initial: Cliente[] = []) {
    this.clientes = [...initial];
  }

  async listar(): Promise<Cliente[]> {
    this.calls.push('listar');
    return [...this.clientes];
  }

  async crear(input: ClienteInput): Promise<Cliente> {
    this.calls.push('crear');
    if (this.clientes.some((c) => c.email === input.email)) {
      throw new ClienteError('duplicate', 'Ya existe un cliente con ese email.');
    }
    const c = makeCliente({ ...input, telefono: input.telefono ?? null });
    this.clientes.push(c);
    return c;
  }

  async actualizar(id: string, input: ClienteInput): Promise<Cliente> {
    this.calls.push('actualizar');
    const i = this.clientes.findIndex((c) => c.id === id);
    if (i < 0) throw new ClienteError('not-found', 'El cliente no existe.');
    this.clientes[i] = { ...this.clientes[i], ...input, telefono: input.telefono ?? null };
    return this.clientes[i];
  }

  async eliminar(id: string): Promise<void> {
    this.calls.push('eliminar');
    const before = this.clientes.length;
    this.clientes = this.clientes.filter((c) => c.id !== id);
    if (this.clientes.length === before) throw new ClienteError('not-found', 'El cliente no existe.');
  }
}
