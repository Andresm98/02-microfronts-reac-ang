interface Props {
  title: string;
  error: Error;
  onRetry: () => void;
}

export function RemoteFallback({ title, error, onRetry }: Props) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-rose-300 bg-rose-50/60 px-6 py-10 text-center dark:border-rose-500/30 dark:bg-rose-500/5"
      role="alert"
    >
      <span className="grid size-11 place-items-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400" aria-hidden="true">
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        </svg>
      </span>
      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title} no está disponible ahora mismo</h3>
      <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
        No pudimos cargar este módulo. El resto de la aplicación sigue funcionando.
      </p>
      <details className="max-w-full text-xs text-slate-500 dark:text-slate-400">
        <summary className="cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200">Detalle técnico</summary>
        <code className="mt-2 block rounded-lg bg-white px-3 py-2 text-left break-all ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-white/10">
          {error.message}
        </code>
      </details>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
      >
        Reintentar
      </button>
    </div>
  );
}
