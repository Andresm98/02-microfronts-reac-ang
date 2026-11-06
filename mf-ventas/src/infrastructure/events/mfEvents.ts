/** Eventos cross-micro definidos en CONTRACTS.md (window + CustomEvent). */
export const CLIENTE_SELECCIONADO = 'clientes:seleccionado' as const;
export const VENTA_CREADA = 'ventas:creada' as const;

export interface ClienteSeleccionadoDetail {
  id: string;
  nombre: string;
}

export interface VentaCreadaDetail {
  id: string;
  clienteId: string;
  total: number;
}

export interface MfEventMap {
  [CLIENTE_SELECCIONADO]: ClienteSeleccionadoDetail;
  [VENTA_CREADA]: VentaCreadaDetail;
}

export type MfEventName = keyof MfEventMap;

export function publish<K extends MfEventName>(name: K, detail: MfEventMap[K], target: EventTarget = window): void {
  target.dispatchEvent(new CustomEvent<MfEventMap[K]>(name, { detail }));
}

/** Suscribe un handler tipado y devuelve la función para desuscribirse. */
export function subscribe<K extends MfEventName>(
  name: K,
  handler: (detail: MfEventMap[K]) => void,
  target: EventTarget = window,
): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<MfEventMap[K]>).detail);
  target.addEventListener(name, listener);
  return () => target.removeEventListener(name, listener);
}

export function publishVentaCreada(detail: VentaCreadaDetail, target?: EventTarget): void {
  publish(VENTA_CREADA, { id: detail.id, clienteId: detail.clienteId, total: detail.total }, target);
}

export function onClienteSeleccionado(handler: (d: ClienteSeleccionadoDetail) => void, target?: EventTarget): () => void {
  return subscribe(CLIENTE_SELECCIONADO, handler, target);
}
