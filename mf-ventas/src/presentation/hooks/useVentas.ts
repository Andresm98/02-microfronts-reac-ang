import { useCallback, useEffect, useRef, useState } from 'react';
import { VentaError, type NuevaVenta, type Venta, type VentaValidationErrors } from '../../domain';
import { publishVentaCreada } from '../../infrastructure/events/mfEvents';
import { useUseCases } from '../UseCasesContext';

export type RegistrarResult =
  | { ok: true; venta: Venta }
  | { ok: false; message: string; errors?: VentaValidationErrors };

function mensaje(e: unknown): string {
  return e instanceof VentaError ? e.message : 'Ha ocurrido un error inesperado.';
}

export function useVentas(clienteId: string) {
  const { listarVentas, registrarVenta } = useUseCases();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const cargar = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const data = await listarVentas.execute(clienteId);
      if (id === requestId.current) setVentas(data);
    } catch (e) {
      if (id === requestId.current) setError(mensaje(e));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [listarVentas, clienteId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const registrar = useCallback(
    async (venta: NuevaVenta): Promise<RegistrarResult> => {
      try {
        const creada = await registrarVenta.execute(venta);
        publishVentaCreada({ id: creada.id, clienteId: creada.clienteId, total: creada.total });
        await cargar();
        return { ok: true, venta: creada };
      } catch (e) {
        const errors =
          e instanceof VentaError && e.kind === 'validation' && e.details && typeof e.details === 'object'
            ? (e.details as VentaValidationErrors)
            : undefined;
        return { ok: false, message: mensaje(e), errors };
      }
    },
    [registrarVenta, cargar],
  );

  return { ventas, loading, error, cargar, registrar };
}
