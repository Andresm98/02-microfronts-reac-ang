import { useCallback, useEffect, useRef, useState } from 'react';
import type { RemoteApp, RemoteModule } from '../../domain/remote-app';
import { useServices } from '../services';
import { ErrorBoundary } from './ErrorBoundary';
import { RemoteFallback } from './RemoteFallback';

interface Props {
  remote: RemoteApp;
  /** basePath que se pasa a mount(); por defecto el del descriptor. */
  basePath?: string;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; module: RemoteModule }
  | { status: 'error'; error: Error };

const toError = (e: unknown) => (e instanceof Error ? e : new Error(String(e)));

function RemoteHost({ remote, basePath, onError }: Props & { onError: (e: Error) => void }) {
  const { loader } = useServices();
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  // 1) Cargar el módulo remoto.
  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    loader
      .load(remote.id)
      .then((module) => !cancelled && setState({ status: 'ready', module }))
      .catch((e: unknown) => !cancelled && onError(toError(e)));
    return () => {
      cancelled = true;
    };
  }, [loader, remote.id, onError]);

  // 2) Montar / desmontar en el contenedor.
  const module = state.status === 'ready' ? state.module : null;
  const effectiveBasePath = basePath ?? remote.basePath;
  useEffect(() => {
    const el = containerRef.current;
    if (!module || !el) return;
    try {
      module.mount(el, { basePath: effectiveBasePath });
    } catch (e) {
      onError(toError(e));
      return;
    }
    return () => {
      try {
        module.unmount(el);
      } catch (e) {
        console.error(`[shell] Error al desmontar ${remote.id}`, e);
      }
    };
  }, [module, effectiveBasePath, remote.id, onError]);

  return (
    <>
      {state.status === 'loading' && (
        <div className="flex flex-col gap-4" role="status" aria-live="polite">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="size-4 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500 dark:border-white/15 dark:border-t-indigo-400" aria-hidden="true" />
            Cargando {remote.title}…
          </div>
          <div className="h-36 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" aria-hidden="true" />
          <div className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" aria-hidden="true" />
        </div>
      )}
      <div ref={containerRef} className="min-w-0" data-remote={remote.id} />
    </>
  );
}

/**
 * Monta un micro-frontend remoto: lo carga mediante el RemoteLoader,
 * llama a mount(el) al estar listo y a unmount(el) al desmontarse.
 * Si el remote cae (carga o mount fallan) muestra un fallback con reintento.
 */
export function RemoteMount({ remote, basePath }: Props) {
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const handleError = useCallback((e: Error) => {
    console.error(`[shell] Remote ${remote.id} falló`, e);
    setError(e);
  }, [remote.id]);

  const retry = useCallback(() => {
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  if (error) return <RemoteFallback title={remote.title} error={error} onRetry={retry} />;

  return (
    <ErrorBoundary
      key={attempt}
      onReset={retry}
      fallback={(e, reset) => <RemoteFallback title={remote.title} error={e} onRetry={reset} />}
    >
      <RemoteHost key={attempt} remote={remote} basePath={basePath} onError={handleError} />
    </ErrorBoundary>
  );
}
