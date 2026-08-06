import { defineConfig, devices } from '@playwright/test';

/**
 * Los E2E asumen que PostgreSQL y Redis están levantados (docker compose)
 * y arrancan la API y la web por su cuenta. No dependen de Internet ni de
 * credenciales de Spotify: la partida usa la colección demo local.
 */
export default defineConfig({
  testDir: './e2e',
  // Las sondas exploran y anotan lo que encuentran, no afirman, así que no
  // entran en el recorrido normal. Para ejecutarlas: `PW_PROBE=1 pnpm exec
  // playwright test e2e/<nombre>.probe.spec.ts`.
  testIgnore: process.env.PW_PROBE ? [] : ['**/*.probe.spec.ts'],
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    // El navegador debe poder reproducir audio sin gesto para el test remoto
    launchOptions: {
      args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'],
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // Los paquetes del workspace se consumen compilados: hay que construir
      // las dependencias de la API antes de arrancarla, porque este comando no
      // pasa por Turborepo y en un checkout limpio no existe ningún `dist`.
      // `@bingo/api^...` selecciona sus dependencias sin incluirla a ella.
      command: 'pnpm --filter "@bingo/api^..." build && pnpm --filter @bingo/api dev',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
    },
    {
      command: 'pnpm --filter "@bingo/web^..." build && pnpm --filter @bingo/web dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
