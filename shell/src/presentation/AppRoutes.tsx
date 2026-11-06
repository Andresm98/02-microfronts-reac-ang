import { Route, Routes } from 'react-router-dom';
import { Layout } from './Layout';
import { DashboardPage } from './pages/DashboardPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RemotePage } from './pages/RemotePage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="clientes/*" element={<RemotePage id="mf_clientes" />} />
        <Route path="ventas/*" element={<RemotePage id="mf_ventas" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
