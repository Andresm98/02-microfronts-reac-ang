/**
 * Contrato de eventos entre micros (ver CONTRACTS.md).
 * Se replica aquí: ninguna app importa código de otra.
 */
export interface ClienteSeleccionadoDetail {
  id: string;
  nombre: string;
}

export interface VentaCreadaDetail {
  id: string;
  clienteId: string;
  total: number;
}

export interface MicroEventMap {
  'clientes:seleccionado': ClienteSeleccionadoDetail;
  'ventas:creada': VentaCreadaDetail;
}

export type MicroEventName = keyof MicroEventMap;

export const MICRO_EVENTS = {
  clienteSeleccionado: 'clientes:seleccionado',
  ventaCreada: 'ventas:creada',
} as const satisfies Record<string, MicroEventName>;
