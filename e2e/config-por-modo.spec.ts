import { expect, test } from '@playwright/test';
import { createGameAndOpenRoom, loginAsHost } from './helpers';

/** Modos que no son bingo, tal y como aparecen en el selector del asistente. */
const NON_BINGO_MODES = ['Quiz musical', 'Adivina la canción', 'Supervivencia', 'Modo mixto'];

/** Controles que solo tienen sentido si hay cartón. */
async function expectBingoControlsVisible(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.getByRole('button', { name: '3 × 3' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /Centro libre/ })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /Premio por línea/ })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /Premio por bingo/ })).toBeVisible();
}

test.describe('Configuración por modo en el asistente', () => {
  test('el bingo musical enseña el cartón y sus premios', async ({ page }) => {
    await loginAsHost(page);
    await page.goto('/dashboard/games/new');

    // «Bingo musical» ya viene seleccionado por defecto.
    await expectBingoControlsVisible(page);
  });

  test('los demás modos no enseñan el cartón ni sus premios, y sí las reglas comunes', async ({
    page,
  }) => {
    await loginAsHost(page);
    await page.goto('/dashboard/games/new');

    for (const modo of NON_BINGO_MODES) {
      await page.getByRole('radio', { name: new RegExp(modo) }).click();

      await expect(page.getByRole('button', { name: '3 × 3' })).toHaveCount(0);
      await expect(page.getByRole('checkbox', { name: /Centro libre/ })).toHaveCount(0);
      await expect(page.getByRole('checkbox', { name: /Premio por línea/ })).toHaveCount(0);
      await expect(page.getByRole('checkbox', { name: /Premio por bingo/ })).toHaveCount(0);

      await expect(page.getByRole('checkbox', { name: /Ranking entre rondas/ })).toBeVisible();
      await expect(page.getByRole('checkbox', { name: /Orden aleatorio/ })).toBeVisible();
    }
  });

  test('la sala de espera de un quiz habla de opciones, no de cartones', async ({ page }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, {
      name: 'E2E config quiz',
      mode: 'Quiz musical',
    });

    await page.goto(`/join/${code}`);

    const cabecera = page.getByText(/jugadores dentro/);
    await expect(cabecera).toBeVisible();
    await expect(cabecera).toContainText('opciones por pregunta');
    await expect(cabecera).not.toContainText('cartón');
  });
});
