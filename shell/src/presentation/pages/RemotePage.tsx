import { Link } from 'react-router-dom';
import type { RemoteId } from '../../domain/remote-app';
import { getRemoteApp } from '../../application/remote-registry';
import { RemoteMount } from '../components/RemoteMount';
import { StackBadge } from '../components/StackBadge';

export function RemotePage({ id }: { id: RemoteId }) {
  const remote = getRemoteApp(id);
  // El remote pinta su propio encabezado; la shell sólo deja un h1 accesible y la miga de pan.
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-4" aria-label={remote.title}>
      <h1 className="sr-only">{remote.title}</h1>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Dashboard
        </Link>
        <StackBadge remote={remote} />
      </div>
      <RemoteMount remote={remote} />
    </section>
  );
}
