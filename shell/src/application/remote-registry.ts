import type { RemoteApp, RemoteId } from '../domain/remote-app';

export const REMOTE_APPS: readonly RemoteApp[] = [
  {
    id: 'mf_clientes',
    title: 'Clientes',
    basePath: '/clientes',
    description: 'Alta, edición y selección de clientes.',
    stack: 'Vue 3',
  },
  {
    id: 'mf_ventas',
    title: 'Ventas',
    basePath: '/ventas',
    description: 'Registro y consulta de ventas.',
    stack: 'React 19',
  },
];

export function getRemoteApp(id: RemoteId): RemoteApp {
  const app = REMOTE_APPS.find((r) => r.id === id);
  if (!app) throw new Error(`Remote desconocido: ${id}`);
  return app;
}
