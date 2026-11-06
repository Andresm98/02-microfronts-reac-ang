import {
  ClienteError,
  normalizarCliente,
  validarCliente,
  type Cliente,
  type ClienteGateway,
  type ClienteInput,
} from '../domain';

function asegurarValido(input: ClienteInput): ClienteInput {
  const errors = validarCliente(input);
  if (Object.keys(errors).length > 0) {
    throw new ClienteError('validation', 'Revisa los campos del formulario.', errors);
  }
  return normalizarCliente(input);
}

export class ListarClientes {
  constructor(private readonly gateway: ClienteGateway) {}
  async execute(): Promise<Cliente[]> {
    const clientes = await this.gateway.listar();
    return [...clientes].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }
}

export class CrearCliente {
  constructor(private readonly gateway: ClienteGateway) {}
  async execute(input: ClienteInput): Promise<Cliente> {
    return this.gateway.crear(asegurarValido(input));
  }
}

export class ActualizarCliente {
  constructor(private readonly gateway: ClienteGateway) {}
  async execute(id: string, input: ClienteInput): Promise<Cliente> {
    if (!id) throw new ClienteError('validation', 'Falta el id del cliente.');
    return this.gateway.actualizar(id, asegurarValido(input));
  }
}

export class EliminarCliente {
  constructor(private readonly gateway: ClienteGateway) {}
  async execute(id: string): Promise<void> {
    if (!id) throw new ClienteError('validation', 'Falta el id del cliente.');
    return this.gateway.eliminar(id);
  }
}

export interface ClientesUseCases {
  listar: ListarClientes;
  crear: CrearCliente;
  actualizar: ActualizarCliente;
  eliminar: EliminarCliente;
}
