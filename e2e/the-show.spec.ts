import { expect, test } from '@playwright/test';
import {
  createGameAndOpenRoom,
  enableAudio,
  joinAsPlayer,
  loginAsHost,
  waitForRoundAcceptingMarks,
} from './helpers';

test.describe('El espectáculo', () => {
  test('una reacción de un jugador la ve el resto de la sala', async ({ browser, page }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, { name: 'E2E reacciones' });

    const marta = await joinAsPlayer(browser, code, 'Marta');
    await enableAudio(marta.page);
    await page.getByRole('button', { name: 'Empezar partida' }).click();
    await waitForRoundAcceptingMarks(marta.page);

    // La proyección es donde se ven: el anfitrión la abre en su misma sesión
    const projector = await page.context().newPage();
    await projector.goto(`/room/${code}/screen`);
    await expect(projector.getByText(/Ronda \d+/)).toBeVisible({ timeout: 30_000 });

    await marta.page.getByRole('button', { name: 'Temazo' }).click();
    await expect(projector.getByText('Marta').first()).toBeVisible({ timeout: 15_000 });

    await projector.close();
    await marta.context.close();
  });

  test('entre rondas se cuenta cómo ha ido', async ({ browser, page }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, { name: 'E2E resumen', snippetSeconds: '10' });

    const marta = await joinAsPlayer(browser, code, 'Marta');
    await enableAudio(marta.page);
    await page.getByRole('button', { name: 'Empezar partida' }).click();
    await waitForRoundAcceptingMarks(marta.page);

    await expect(marta.page.getByRole('heading', { name: 'Cómo ha ido la ronda' })).toBeVisible({
      timeout: 60_000,
    });
    // Siempre se dice cuánta gente la tenía, aunque no la tuviera nadie
    await expect(marta.page.getByText(/No la tenía nadie|La tenían/)).toBeVisible();

    await marta.context.close();
  });
});
