import type { RemoteApp } from '../../domain/remote-app';

/** Etiqueta con la tecnología y el id Module Federation de un remote. */
export function StackBadge({ remote }: { remote: RemoteApp }) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-xs">
      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700 dark:bg-white/10 dark:text-slate-200">
        {remote.stack}
      </span>
      <code className="truncate text-slate-400 dark:text-slate-500">{remote.id}</code>
    </div>
  );
}
