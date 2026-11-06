import { useEffect, useRef } from 'react';
import { onClienteSeleccionado, type ClienteSeleccionadoDetail } from '../../infrastructure/events/mfEvents';

/** Escucha `clientes:seleccionado` (emitido por mf-clientes) mientras el componente está montado. */
export function useClienteSeleccionado(handler: (detail: ClienteSeleccionadoDetail) => void): void {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => onClienteSeleccionado((d) => ref.current(d)), []);
}
