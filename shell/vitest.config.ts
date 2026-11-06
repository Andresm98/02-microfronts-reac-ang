import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Config de tests separada: sin plugin de federation (los remotes se simulan).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
