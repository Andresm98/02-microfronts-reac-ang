import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

const DEFAULT_CLIENTES = 'http://localhost:5001/remoteEntry.js';
const DEFAULT_VENTAS = 'http://localhost:5002/remoteEntry.js';

export default defineConfig(({ mode }) => {
  // Las URLs de los remoteEntry se resuelven en build/dev (process.env > .env*).
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env };
  const clientesEntry = env.VITE_MF_CLIENTES_URL || DEFAULT_CLIENTES;
  const ventasEntry = env.VITE_MF_VENTAS_URL || DEFAULT_VENTAS;

  return {
    plugins: [
      react(),
      tailwindcss(),
      federation({
        name: 'shell',
        remotes: {
          mf_clientes: { type: 'module', name: 'mf_clientes', entry: clientesEntry, entryGlobalName: 'mf_clientes' },
          mf_ventas: { type: 'module', name: 'mf_ventas', entry: ventasEntry, entryGlobalName: 'mf_ventas' },
        },
        // No se comparte react/vue: cada remote empaqueta su framework y sólo expone mount/unmount.
        shared: {},
        dts: false,
      }),
    ],
    server: { port: 5000, strictPort: true, origin: 'http://localhost:5000' },
    preview: { port: 5000, strictPort: true },
    build: { target: 'esnext' },
  };
});
