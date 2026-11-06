import type { Venta } from '../../domain';
import { formatFecha, formatMoney } from '../format';

interface Props {
  ventas: Venta[];
  loading: boolean;
  error: string | null;
  nombreCliente: (id: string) => string;
  onRetry: () => void;
  filtrado: boolean;
}

// Bajo @3xl (contenedor estrecho) cada venta se pinta como tarjeta; a partir de @3xl, como tabla.
const cell = 'mfv:block mfv:@3xl:table-cell mfv:@3xl:px-4 mfv:@3xl:py-3 mfv:@3xl:align-middle';

export function VentasList({ ventas, loading, error, nombreCliente, onRetry, filtrado }: Props) {
  if (loading && ventas.length === 0) {
    return (
      <div className="mfv:flex mfv:flex-col mfv:gap-3 mfv:rounded-2xl mfv:p-4 mfv:ring-1 mfv:ring-slate-200 mfv:dark:ring-white/10" data-state="loading" aria-label="Cargando ventas…">
        {[1, 2, 3].map((i) => (
          <div key={i} className="mfv:h-12 mfv:animate-pulse mfv:rounded-lg mfv:bg-slate-100 mfv:dark:bg-white/5" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div
        className="mfv:rounded-2xl mfv:bg-rose-50 mfv:p-6 mfv:text-center mfv:text-sm mfv:text-rose-700 mfv:ring-1 mfv:ring-rose-200 mfv:dark:bg-rose-500/10 mfv:dark:text-rose-300 mfv:dark:ring-rose-500/20"
        data-state="error"
        role="alert"
      >
        {error}{' '}
        <button type="button" className="mfv:font-medium mfv:underline mfv:underline-offset-2" onClick={onRetry}>
          Reintentar
        </button>
      </div>
    );
  }
  if (ventas.length === 0) {
    return (
      <div
        className="mfv:rounded-2xl mfv:border mfv:border-dashed mfv:border-slate-300 mfv:p-8 mfv:text-center mfv:text-sm mfv:text-slate-500 mfv:dark:border-white/15 mfv:dark:text-slate-400"
        data-state="empty"
      >
        {filtrado ? 'Este cliente aún no tiene ventas.' : 'Aún no hay ventas registradas.'}
      </div>
    );
  }
  const totalGeneral = ventas.reduce((acc, v) => acc + v.total, 0);
  return (
    <div className="mfv-card mfv:overflow-hidden">
      <table className="mfv:block mfv:w-full mfv:text-sm mfv:@3xl:table mfv:@3xl:border-collapse">
        <thead className="mfv:hidden mfv:bg-slate-50 mfv:text-left mfv:text-xs mfv:tracking-wide mfv:text-slate-500 mfv:uppercase mfv:@3xl:table-header-group mfv:dark:bg-white/5 mfv:dark:text-slate-400">
          <tr>
            <th className="mfv:px-4 mfv:py-3 mfv:font-medium">Cliente</th>
            <th className="mfv:px-4 mfv:py-3 mfv:font-medium">Fecha</th>
            <th className="mfv:px-4 mfv:py-3 mfv:font-medium">Productos</th>
            <th className="mfv:px-4 mfv:py-3 mfv:text-right mfv:font-medium">Total</th>
          </tr>
        </thead>
        <tbody className="mfv:block mfv:divide-y mfv:divide-slate-100 mfv:@3xl:table-row-group mfv:dark:divide-white/5">
          {ventas.map((v) => (
            <tr
              key={v.id}
              data-id={v.id}
              className="mfv:grid mfv:grid-cols-[minmax(0,1fr)_auto] mfv:gap-x-4 mfv:gap-y-1 mfv:p-4 mfv:transition-colors mfv:hover:bg-slate-50 mfv:@3xl:table-row mfv:@3xl:p-0 mfv:dark:hover:bg-white/5"
            >
              <td className={`${cell} mfv:font-semibold`}>{nombreCliente(v.clienteId)}</td>
              <td className="mfv:row-span-2 mfv:block mfv:self-center mfv:text-right mfv:text-base mfv:font-semibold mfv:tabular-nums mfv:@3xl:hidden" aria-hidden="true">
                {formatMoney(v.total)}
              </td>
              <td className={`${cell} mfv:text-xs mfv:text-slate-500 mfv:@3xl:text-sm mfv:@3xl:whitespace-nowrap mfv:@3xl:text-slate-600 mfv:dark:text-slate-400`}>
                {formatFecha(v.fecha)}
              </td>
              <td className={`${cell} mfv:col-span-2 mfv:mt-2 mfv:@3xl:mt-0 mfv:@3xl:max-w-80`}>
                <ul className="mfv:m-0 mfv:flex mfv:list-none mfv:flex-wrap mfv:gap-1.5 mfv:p-0">
                  {v.lineas.map((l, i) => (
                    <li
                      key={i}
                      className="mfv:rounded-md mfv:bg-slate-100 mfv:px-2 mfv:py-0.5 mfv:text-xs mfv:text-slate-600 mfv:dark:bg-white/10 mfv:dark:text-slate-300"
                    >
                      {`${l.producto} ×${l.cantidad}`}
                    </li>
                  ))}
                </ul>
              </td>
              <td className="mfv:hidden mfv:text-right mfv:font-semibold mfv:tabular-nums mfv:@3xl:table-cell mfv:@3xl:px-4 mfv:@3xl:py-3 mfv:@3xl:align-middle">{formatMoney(v.total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="mfv:block mfv:border-t mfv:border-slate-200 mfv:bg-slate-50 mfv:@3xl:table-footer-group mfv:dark:border-white/10 mfv:dark:bg-white/5">
          <tr className="mfv:flex mfv:items-center mfv:justify-between mfv:p-4 mfv:@3xl:table-row mfv:@3xl:p-0">
            <td colSpan={3} className={`${cell} mfv:text-slate-500 mfv:dark:text-slate-400`}>
              {ventas.length} venta{ventas.length === 1 ? '' : 's'}
            </td>
            <td className={`${cell} mfv:text-right mfv:font-semibold mfv:tabular-nums`}>{formatMoney(totalGeneral)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
