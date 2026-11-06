import { useEffect, useState } from 'react';
import type { ClienteSeleccionadoDetail, VentaCreadaDetail } from '../contracts/events';
import { MICRO_EVENTS } from '../contracts/events';
import { useServices } from './services';

/** Último cliente seleccionado en mf-clientes. */
export function useClienteSeleccionado(): ClienteSeleccionadoDetail | null {
  const { bus } = useServices();
  const [cliente, setCliente] = useState<ClienteSeleccionadoDetail | null>(null);
  useEffect(() => bus.on(MICRO_EVENTS.clienteSeleccionado, setCliente), [bus]);
  return cliente;
}

export interface Toast {
  id: number;
  message: string;
}

const currency = new Intl.NumberFormat('es', { style: 'currency', currency: 'USD' });

/** Notificaciones efímeras para `ventas:creada`. */
export function useVentaCreadaToasts(durationMs = 4000): Toast[] {
  const { bus } = useServices();
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let seq = 0;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const off = bus.on(MICRO_EVENTS.ventaCreada, (venta: VentaCreadaDetail) => {
      const id = ++seq;
      setToasts((t) => [...t, { id, message: `Venta registrada por ${currency.format(venta.total)}` }]);
      const timer = setTimeout(() => {
        timers.delete(timer);
        setToasts((t) => t.filter((x) => x.id !== id));
      }, durationMs);
      timers.add(timer);
    });
    return () => {
      off();
      timers.forEach(clearTimeout);
    };
  }, [bus, durationMs]);

  return toasts;
}
