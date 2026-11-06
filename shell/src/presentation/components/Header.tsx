import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { REMOTE_APPS } from '../../application/remote-registry';
import { useClienteSeleccionado, useVentaCreadaToasts } from '../hooks';

const NAV = [{ to: '/', label: 'Dashboard', end: true }, ...REMOTE_APPS.map((r) => ({ to: r.basePath, label: r.title, end: false }))];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
  }`;

export function Header() {
  const cliente = useClienteSeleccionado();
  const toasts = useVentaCreadaToasts();
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-lg dark:border-white/10 dark:bg-slate-950/75">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:gap-6 sm:px-6 lg:px-8">
          <NavLink to="/" className="flex shrink-0 items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-linear-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-sm shadow-indigo-500/30">
              PC
            </span>
            <span className="hidden font-semibold tracking-tight sm:inline">Portal Comercial</span>
          </NavLink>

          <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div
            className={`ml-auto flex min-w-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors ${
              cliente
                ? 'bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-100 dark:ring-indigo-500/30'
                : 'text-slate-500 dark:text-slate-400'
            }`}
            aria-live="polite"
            data-testid="cliente-seleccionado"
          >
            {cliente ? (
              <>
                <span className="size-2 shrink-0 rounded-full bg-indigo-500" aria-hidden="true" />
                <span className="hidden sm:inline">Cliente:</span> <strong className="truncate font-semibold">{cliente.nombre}</strong>
              </>
            ) : (
              <span className="truncate">Ningún cliente seleccionado</span>
            )}
          </div>

          <button
            type="button"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden dark:text-slate-300 dark:hover:bg-white/10"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            aria-controls="menu-movil"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              {menuOpen ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <nav id="menu-movil" aria-label="Principal (móvil)" className="flex flex-col gap-1 border-t border-slate-200 px-4 py-3 md:hidden dark:border-white/10">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      {/* Fuera del header: su backdrop-filter crearía un containing block para los `fixed`. */}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex w-full items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg shadow-slate-900/20 ring-1 ring-white/10 animate-toast-in sm:w-auto dark:bg-white dark:text-slate-900"
            role="status"
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-emerald-500 text-white" aria-hidden="true">
              <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.58l7.3-7.3a1 1 0 0 1 1.4 0Z" clipRule="evenodd" />
              </svg>
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </>
  );
}
