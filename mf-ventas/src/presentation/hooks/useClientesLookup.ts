import { useCallback, useEffect, useState } from 'react';
import { VentaError, type ClienteResumen } from '../../domain';
import { useUseCases } from '../UseCasesContext';

export function useClientesLookup() {
  const { listarClientes } = useUseCases();
  const [clientes, setClientes] = useState<ClienteResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setClientes(await listarClientes.execute());
    } catch (e) {
      setError(e instanceof VentaError ? e.message : 'No se pudieron cargar los clientes.');
    } finally {
      setLoading(false);
    }
  }, [listarClientes]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return { clientes, loading, error, recargar: cargar };
}
