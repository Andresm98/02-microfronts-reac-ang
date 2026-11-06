import { Link } from 'react-router-dom';
import { REMOTE_APPS } from '../../application/remote-registry';
import { RemoteMount } from '../components/RemoteMount';
import { StackBadge } from '../components/StackBadge';

export function DashboardPage() {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Panel comercial</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Clientes y ventas en una sola vista. Cada módulo es un micro-frontend independiente.
        </p>
      </div>

      {/* Lado a lado sólo en pantallas anchas; los micros adaptan su layout al ancho del panel (container queries). */}
      <div className="grid items-start gap-6 xl:grid-cols-2">
        {REMOTE_APPS.map((remote) => (
          <article
            key={remote.id}
            className="min-w-0 rounded-2xl bg-white/60 ring-1 ring-slate-200 dark:bg-slate-900/40 dark:ring-white/10"
            aria-label={remote.title}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5 dark:border-white/10">
              <StackBadge remote={remote} />
              <Link
                to={remote.basePath}
                className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                Pantalla completa
                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                </svg>
              </Link>
            </div>
            <div className="p-4 sm:p-5">
              <RemoteMount remote={remote} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
