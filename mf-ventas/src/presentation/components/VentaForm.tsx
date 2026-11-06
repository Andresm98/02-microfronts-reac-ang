import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { ClienteResumen, VentaValidationErrors } from '../../domain';
import { validarVenta, tieneErrores } from '../../domain';
import { useUseCases } from '../UseCasesContext';
import { formatMoney } from '../format';
import type { RegistrarResult } from '../hooks/useVentas';

interface LineaDraft {
  key: number;
  producto: string;
  cantidad: string;
  precioUnitario: string;
}

interface Props {
  clientes: ClienteResumen[];
  clientesLoading: boolean;
  clientesError: string | null;
  /** Cliente a precargar (p. ej. tras `clientes:seleccionado`). */
  preselect: { clienteId: string } | null;
  onSubmit: (venta: { clienteId: string; lineas: { producto: string; cantidad: number; precioUnitario: number }[] }) => Promise<RegistrarResult>;
  onRetryClientes: () => void;
}

let nextKey = 1;
const nuevaLinea = (): LineaDraft => ({ key: nextKey++, producto: '', cantidad: '1', precioUnitario: '' });
const toNum = (v: string) => (v.trim() === '' ? NaN : Number(v));

// Bajo @xl (contenedor estrecho) cada línea se apila: producto arriba y cantidad/precio/subtotal debajo.
// A partir de @xl todas las columnas van en una fila alineada con la cabecera.
const lineaGrid =
  'mfv:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] mfv:items-start mfv:gap-x-3 mfv:gap-y-2 mfv:@xl:grid-cols-[minmax(0,1fr)_6rem_8rem_7rem_2.25rem]';

export function VentaForm({ clientes, clientesLoading, clientesError, preselect, onSubmit, onRetryClientes }: Props) {
  const { calcularTotalPreview } = useUseCases();
  const [clienteId, setClienteId] = useState(preselect?.clienteId ?? '');
  const [lineas, setLineas] = useState<LineaDraft[]>(() => [nuevaLinea()]);
  const [errors, setErrors] = useState<VentaValidationErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (preselect) setClienteId(preselect.clienteId);
  }, [preselect]);

  const parsed = useMemo(
    () => lineas.map((l) => ({ producto: l.producto, cantidad: toNum(l.cantidad), precioUnitario: toNum(l.precioUnitario) })),
    [lineas],
  );
  const preview = useMemo(() => calcularTotalPreview.execute(parsed), [calcularTotalPreview, parsed]);

  function update(key: number, field: keyof Omit<LineaDraft, 'key'>, value: string) {
    setLineas((prev) => prev.map((l) => (l.key === key ? { ...l, [field]: value } : l)));
  }

  function remove(key: number) {
    setLineas((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const venta = { clienteId, lineas: parsed };
    const v = validarVenta(venta);
    setErrors(v);
    if (tieneErrores(v)) return;
    setSaving(true);
    const result = await onSubmit(venta);
    setSaving(false);
    if (result.ok) {
      setLineas([nuevaLinea()]);
      setErrors({});
    } else {
      setFormError(result.message);
      if (result.errors) setErrors(result.errors);
    }
  }

  return (
    <form className="mfv-card mfv:p-4 mfv:@md:p-5" onSubmit={handleSubmit} noValidate aria-label="Registrar venta">
      <div className="mfv:mb-4 mfv:flex mfv:items-center mfv:gap-2">
        <span
          className="mfv:grid mfv:size-7 mfv:place-items-center mfv:rounded-lg mfv:bg-indigo-50 mfv:text-indigo-600 mfv:dark:bg-indigo-500/15 mfv:dark:text-indigo-300"
          aria-hidden="true"
        >
          <svg className="mfv:size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
            <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
          </svg>
        </span>
        <h3 className="mfv:text-base mfv:font-semibold">Registrar venta</h3>
      </div>

      {formError && (
        <div
          className="mfv:mb-4 mfv:rounded-lg mfv:bg-rose-50 mfv:px-3 mfv:py-2 mfv:text-sm mfv:text-rose-700 mfv:ring-1 mfv:ring-rose-200 mfv:dark:bg-rose-500/10 mfv:dark:text-rose-300 mfv:dark:ring-rose-500/20"
          role="alert"
        >
          {formError}
        </div>
      )}

      <label className="mfv:flex mfv:flex-col mfv:gap-1.5 mfv:@xl:max-w-md">
        <span className="mfv-label">Cliente</span>
        <select
          name="clienteId"
          className="mfv-input"
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          aria-invalid={!!errors.clienteId}
          disabled={clientesLoading}
        >
          <option value="">{clientesLoading ? 'Cargando clientes…' : 'Selecciona un cliente'}</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} — {c.email}
            </option>
          ))}
        </select>
        {errors.clienteId && <span className="mfv-error">{errors.clienteId}</span>}
        {clientesError && (
          <span className="mfv-error">
            {clientesError}{' '}
            <button type="button" className="mfv:font-medium mfv:underline mfv:underline-offset-2" onClick={onRetryClientes}>
              Reintentar
            </button>
          </span>
        )}
      </label>

      <div className="mfv:mt-5 mfv:flex mfv:flex-col mfv:gap-3">
        <div className={`${lineaGrid} mfv:hidden mfv:@xl:grid mfv-label mfv:tracking-wide mfv:uppercase`} aria-hidden="true">
          <span>Producto</span>
          <span>Cantidad</span>
          <span>Precio unit.</span>
          <span className="mfv:text-right">Subtotal</span>
          <span />
        </div>
        {lineas.map((l, i) => {
          const le = errors.lineasDetalle?.[i] ?? {};
          return (
            <div
              key={l.key}
              className={`${lineaGrid} mfv:grid mfv:rounded-xl mfv:bg-slate-50 mfv:p-3 mfv:@xl:bg-transparent mfv:@xl:p-0 mfv:dark:bg-white/5 mfv:dark:@xl:bg-transparent`}
              data-testid="linea"
            >
              <div className="mfv:col-span-2 mfv:flex mfv:min-w-0 mfv:flex-col mfv:gap-1 mfv:@xl:col-span-1">
                <input
                  aria-label={`Producto línea ${i + 1}`}
                  className="mfv-input"
                  value={l.producto}
                  placeholder="Producto"
                  aria-invalid={!!le.producto}
                  onChange={(e) => update(l.key, 'producto', e.target.value)}
                />
                {le.producto && <span className="mfv-error">{le.producto}</span>}
              </div>
              <button
                type="button"
                className="mfv:col-start-3 mfv:row-start-1 mfv:grid mfv:size-9 mfv:place-items-center mfv:rounded-lg mfv:text-slate-400 mfv:transition mfv:hover:bg-rose-50 mfv:hover:text-rose-600 mfv:disabled:cursor-not-allowed mfv:disabled:opacity-40 mfv:disabled:hover:bg-transparent mfv:disabled:hover:text-slate-400 mfv:@xl:col-start-5 mfv:dark:hover:bg-rose-500/10"
                aria-label={`Quitar línea ${i + 1}`}
                disabled={lineas.length === 1}
                onClick={() => remove(l.key)}
              >
                <svg className="mfv:size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
              <div className="mfv:flex mfv:min-w-0 mfv:flex-col mfv:gap-1 mfv:@xl:col-start-2 mfv:@xl:row-start-1">
                <input
                  aria-label={`Cantidad línea ${i + 1}`}
                  className="mfv-input"
                  type="number"
                  min={1}
                  step={1}
                  value={l.cantidad}
                  aria-invalid={!!le.cantidad}
                  onChange={(e) => update(l.key, 'cantidad', e.target.value)}
                />
                {le.cantidad && <span className="mfv-error">{le.cantidad}</span>}
              </div>
              <div className="mfv:flex mfv:min-w-0 mfv:flex-col mfv:gap-1 mfv:@xl:col-start-3 mfv:@xl:row-start-1">
                <input
                  aria-label={`Precio línea ${i + 1}`}
                  className="mfv-input"
                  type="number"
                  min={0}
                  step="0.01"
                  value={l.precioUnitario}
                  placeholder="0,00"
                  aria-invalid={!!le.precioUnitario}
                  onChange={(e) => update(l.key, 'precioUnitario', e.target.value)}
                />
                {le.precioUnitario && <span className="mfv-error">{le.precioUnitario}</span>}
              </div>
              <span className="mfv:self-center mfv:text-right mfv:text-sm mfv:font-medium mfv:tabular-nums mfv:@xl:col-start-4 mfv:@xl:row-start-1">
                {formatMoney(preview.subtotales[i])}
              </span>
            </div>
          );
        })}
        {errors.lineas && <span className="mfv-error">{errors.lineas}</span>}
      </div>

      <div className="mfv:mt-4 mfv:flex mfv:flex-wrap mfv:items-center mfv:justify-between mfv:gap-3 mfv:border-t mfv:border-slate-100 mfv:pt-4 mfv:dark:border-white/10">
        <button type="button" className="mfv-btn mfv-btn-ghost" onClick={() => setLineas((p) => [...p, nuevaLinea()])}>
          + Añadir línea
        </button>
        <div className="mfv:flex mfv:items-baseline mfv:gap-2">
          <span className="mfv-label">Total</span>
          <strong className="mfv:text-2xl mfv:font-semibold mfv:tracking-tight mfv:tabular-nums" data-testid="total-preview">
            {formatMoney(preview.total)}
          </strong>
        </div>
      </div>
      <div className="mfv:mt-4 mfv:flex mfv:@sm:justify-end">
        <button type="submit" className="mfv-btn mfv-btn-primary mfv:w-full mfv:@sm:w-auto" disabled={saving}>
          {saving ? 'Registrando…' : 'Registrar venta'}
        </button>
      </div>
    </form>
  );
}
