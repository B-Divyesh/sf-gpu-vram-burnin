import { defineConfig } from 'vite';

export default defineConfig({
  build: { target: 'es2022', sourcemap: false },
  server: { port: 4173, strictPort: true },
  test: { include: ['src/**/*.test.ts'] }
});
