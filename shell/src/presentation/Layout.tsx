import { Outlet } from 'react-router-dom';
import { Header } from './components/Header';

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
        Shell · Module Federation host
      </footer>
    </div>
  );
}
