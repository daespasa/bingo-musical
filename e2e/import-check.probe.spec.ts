import { test, expect } from '@playwright/test';
import { loginAsHost } from './helpers';

/**
 * Comprobación manual de la importación real contra Spotify. Necesita
 * credenciales en el `.env`, así que no entra en el recorrido normal:
 *
 *   PW_PROBE=1 PROBE_PLAYLIST=<enlace> pnpm exec playwright test \
 *     e2e/import-check.probe.spec.ts --reporter=list
 */
const PLAYLIST =
  process.env.PROBE_PLAYLIST ?? 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M';

test('importar una lista grande desde la pantalla', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await loginAsHost(page);
  await page.goto('/dashboard/music');

  await page.getByPlaceholder('https://open.spotify.com/playlist/…').fill(PLAYLIST);
  await page.getByPlaceholder('Nombre de la colección (opcional)').fill('Prueba pantalla');
  await page.getByRole('button', { name: 'Importar playlist' }).click();

  await expect(page.getByText(/Guardadas \d+ canciones/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/Suenan \d+ de \d+/)).toBeVisible({ timeout: 120_000 });
  await page.screenshot({ path: `${process.env.SHOT_DIR ?? '.'}/import.png`, fullPage: false });

  expect(errors, 'la pantalla lanzó errores').toEqual([]);
});
