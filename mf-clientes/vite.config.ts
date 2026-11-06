/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { federation } from '@module-federation/vite';

const PORT = 5001;
// Origen público desde el que el navegador descarga este remote. Los chunks se
// resuelven con URL absoluta para que funcionen al consumirse desde la shell (5000).
const PUBLIC_URL = withTrailingSlash(process.env.MF_PUBLIC_URL ?? `http://localhost:${PORT}/`);

function withTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`;
}

export default defineConfig(({ mode }) => ({
  base: mode === 'test' ? '/' : PUBLIC_URL,
  plugins: [
    vue(),
    tailwindcss(),
    mode !== 'test' &&
      federation({
        name: 'mf_clientes',
        filename: 'remoteEntry.js',
        exposes: {
          './mount': './src/bootstrap.ts',
        },
        // Vue NO se comparte: el remote es autocontenido y la shell agnóstica.
        shared: {},
        dts: false,
      }),
  ],
  server: {
    port: PORT,
    strictPort: true,
    cors: true,
    origin: PUBLIC_URL.replace(/\/$/, ''),
  },
  preview: {
    port: PORT,
    strictPort: true,
    cors: true,
  },
  build: {
    target: 'esnext',
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.spec.ts'],
  },
}));
