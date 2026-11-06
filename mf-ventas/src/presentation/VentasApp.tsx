import { useCallback, useEffect, useRef, useState } from 'react';
import type { RegistrarResult } from './hooks/useVentas';
import { useVentas } from './hooks/useVentas';
import { useClientesLookup } from './hooks/useClientesLookup';
import { useClienteSeleccionado } from './hooks/useClienteSeleccionado';
import { VentaForm } from './components/VentaForm';
import { VentasList } from './components/VentasList';
import { formatMoney } from './format';
import type { NuevaVenta } from '../domain';

export interface VentasAppProps {
  basePath?: string;
}

export function VentasApp(_props: VentasAppProps) {
  const [filtroClienteId, setFiltroClienteId] = useState('');
  const [preselect, setPreselect] = useState<{ clienteId: string } | null>(null);
  const [nombresExtra, setNombresExtra] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const lookup = useClientesLookup();
  const { ventas, loading, error, cargar, registrar } = useVentas(filtroClienteId);

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  useClienteSeleccionado(({ id, nombre }) => {
    setFiltroClienteId(id);
    setPreselect({ clienteId: id });
    setNombresExtra((prev) => ({ ...prev, [id]: nombre }));
    // Cliente recién creado en mf-clientes: refresca el selector.
    if (!lookup.clientes.some((c) => c.id === id)) void lookup.recargar();
  });

  const nombreCliente = useCallback(
    (id: string) => lookup.clientes.find((c) => c.id === id)?.nombre ?? nombresExtra[id] ?? id.slice(0, 8),
    [lookup.clientes, nombresExtra],
  );

  async function handleSubmit(venta: NuevaVenta): Promise<RegistrarResult> {
    const r = await registrar(venta);
    if (r.ok) {
      setNotice(`Venta registrada a ${nombreCliente(r.venta.clienteId)} por ${formatMoney(r.venta.total)}.`);
      clearTimeout(noticeTimer.current);
      noticeTimer.current = setTimeout(() => setNotice(null), 3500);
    }
    return r;
  }

  return (
    // `.mfv` es la raíz del micro (reset acotado) y el contenedor de las container queries.
    <section className="mfv mfv:@container mfv:flex mfv:flex-col mfv:gap-5 mfv:text-slate-800 mfv:dark:text-slate-100">
      <header className="mfv:min-w-0">
        <h2 className="mfv:text-xl mfv:font-semibold mfv:tracking-tight">Ventas</h2>
        <p className="mfv:mt-1 mfv:text-sm mfv:text-slate-500 mfv:dark:text-slate-400">
          Registra ventas y consulta el historial por cliente.
        </p>
      </header>

      <VentaForm
        clientes={lookup.clientes}
        clientesLoading={lookup.loading}
        clientesError={lookup.error}
        preselect={preselect}
        onSubmit={handleSubmit}
        onRetryClientes={() => void lookup.recargar()}
      />

      {notice && (
        <div
          className="mfv:flex mfv:items-center mfv:gap-2 mfv:rounded-lg mfv:bg-emerald-50 mfv:px-3 mfv:py-2 mfv:text-sm mfv:text-emerald-700 mfv:ring-1 mfv:ring-emerald-200 mfv:dark:bg-emerald-500/10 mfv:dark:text-emerald-300 mfv:dark:ring-emerald-500/20"
          role="status"
        >
          <svg className="mfv:size-4 mfv:shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.58l7.3-7.3a1 1 0 0 1 1.4 0Z"
              clipRule="evenodd"
            />
          </svg>
          {notice}
        </div>
      )}

      <div className="mfv:flex mfv:flex-col mfv:gap-3">
        <div className="mfv:flex mfv:flex-wrap mfv:items-end mfv:justify-between mfv:gap-3">
          <label className="mfv:flex mfv:min-w-0 mfv:flex-1 mfv:flex-col mfv:gap-1.5 mfv:@md:max-w-xs">
            <span className="mfv-label">Filtrar por cliente</span>
            <select
              name="filtroCliente"
              className="mfv-input"
              value={filtroClienteId}
              onChange={(e) => setFiltroClienteId(e.target.value)}
            >
              <option value="">Todos los clientes</option>
              {lookup.clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
              {filtroClienteId && !lookup.clientes.some((c) => c.id === filtroClienteId) && (
                <option value={filtroClienteId}>{nombreCliente(filtroClienteId)}</option>
              )}
            </select>
          </label>
          <button type="button" className="mfv-btn mfv-btn-ghost" onClick={() => void cargar()} disabled={loading}>
            <svg
              className={`mfv:size-4 ${loading ? 'mfv:animate-spin' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
            Recargar
          </button>
        </div>

        <VentasList
          ventas={ventas}
          loading={loading}
          error={error}
          nombreCliente={nombreCliente}
          onRetry={() => void cargar()}
          filtrado={!!filtroClienteId}
        />
      </div>
    </section>
  );
}
