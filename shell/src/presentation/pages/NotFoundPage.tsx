import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="flex flex-col items-center gap-3 py-20 text-center">
      <p className="bg-linear-to-br from-indigo-500 to-violet-600 bg-clip-text text-7xl font-bold tracking-tight text-transparent">404</p>
      <h1 className="text-xl font-semibold">Página no encontrada</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">La página que buscas no existe.</p>
      <Link
        to="/"
        className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
      >
        Volver al dashboard
      </Link>
    </section>
  );
}
