import type { InjectionKey } from 'vue';
import {
  ActualizarCliente,
  CrearCliente,
  EliminarCliente,
  ListarClientes,
  type ClientesUseCases,
} from './application/clientesUseCases';
import type { ClienteGateway } from './domain';
import { HttpClienteGateway } from './infrastructure/HttpClienteGateway';

export const API_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/** Composition root: conecta gateways (infraestructura) con casos de uso (aplicación). */
export function createUseCases(gateway: ClienteGateway = new HttpClienteGateway(API_URL)): ClientesUseCases {
  return {
    listar: new ListarClientes(gateway),
    crear: new CrearCliente(gateway),
    actualizar: new ActualizarCliente(gateway),
    eliminar: new EliminarCliente(gateway),
  };
}

export const USE_CASES_KEY: InjectionKey<ClientesUseCases> = Symbol('mf_clientes.useCases');
