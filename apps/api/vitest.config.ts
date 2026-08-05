import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Entorno hermético: sin .env en disco ni credenciales externas
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
});
