import { expect, test, type Page } from '@playwright/test';
import { createGameAndOpenRoom, enableAudio, joinAsPlayer, loginAsHost } from './helpers';

/** La tarjeta con mis vidas, para no confundirla con la lista de la sala. */
function misVidas(page: Page) {
  return page.getByRole('status', { name: 'Tus vidas' });
}

/** Espera a que la ronda admita respuestas. */
async function waitForOptions(page: Page): Promise<void> {
  await expect(page.getByRole('button', { name: /^Opción A:/ })).toBeEnabled({ timeout: 40_000 });
}

/**
 * Responde deliberadamente mal: elige una opción que no sea la correcta.
 *
 * Como el cliente no sabe cuál es la correcta —a propósito—, se prueban las
 * cuatro a lo largo de las rondas y basta con fallar alguna.
 */
async function responderAlgo(page: Page, letra: 'A' | 'B'): Promise<void> {
  const boton = page.getByRole('button', { name: new RegExp(`^Opción ${letra}:`) });
  if (await boton.isEnabled()) await boton.click();
}

test.describe('Supervivencia', () => {
  test('el selector ofrece el modo y su configuración propia', async ({ page }) => {
    await loginAsHost(page);
    await page.goto('/dashboard/games/new');

    const survival = page.getByRole('radio', { name: /Supervivencia/ });
    await expect(survival).toBeEnabled();
    await expect(survival).not.toContainText('Próximamente');

    await survival.click();
    await expect(page.getByRole('group', { name: 'Vidas por jugador' })).toBeVisible();
    await expect(page.getByRole('group', { name: '¿Cómo se responde?' })).toBeVisible();
    await expect(
      page.getByRole('checkbox', { name: /No responder cuesta una vida/ }),
    ).toBeVisible();
  });

  test('se ven las vidas y quien falla pierde una', async ({ browser, page }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, {
      name: 'E2E supervivencia',
      mode: 'Supervivencia',
      lives: 3,
    });
    const marta = await joinAsPlayer(browser, code, 'Marta');
    const leo = await joinAsPlayer(browser, code, 'Leo');
    await enableAudio(marta.page);
    await enableAudio(leo.page);
    await page.getByRole('button', { name: 'Empezar partida' }).click();

    await waitForOptions(marta.page);

    // Las vidas se leen en texto, no solo en corazones.
    await expect(misVidas(marta.page).getByText('3 vidas')).toBeVisible();

    // Marta no responde nunca: por defecto, callarse cuesta vida.
    await responderAlgo(leo.page, 'A');

    // Al cerrarse la ronda, Marta ha perdido una vida.
    await expect(misVidas(marta.page).getByText('2 vidas')).toBeVisible({ timeout: 60_000 });

    await marta.context.close();
    await leo.context.close();
  });

  test('quien se queda sin vidas pasa a espectador y no puede responder', async ({
    browser,
    page,
  }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, {
      name: 'E2E eliminación',
      mode: 'Supervivencia',
      lives: 1,
    });
    const marta = await joinAsPlayer(browser, code, 'Marta');
    const leo = await joinAsPlayer(browser, code, 'Leo');
    await enableAudio(marta.page);
    await enableAudio(leo.page);
    await page.getByRole('button', { name: 'Empezar partida' }).click();

    await waitForOptions(marta.page);
    await expect(misVidas(marta.page).getByText('1 vida')).toBeVisible();
    await expect(misVidas(marta.page).getByText('última oportunidad')).toBeVisible();

    // Con una sola vida y sin responder, Marta cae en la primera ronda.
    await expect(misVidas(marta.page).getByText('Estás eliminado')).toBeVisible({
      timeout: 60_000,
    });
    await expect(
      marta.page.getByText('Sigues viendo la partida, las respuestas y la clasificación.'),
    ).toBeVisible();

    await marta.context.close();
    await leo.context.close();
  });

  test('la reconexión no devuelve vidas', async ({ browser, page }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, {
      name: 'E2E vidas reconexión',
      mode: 'Supervivencia',
      lives: 2,
    });
    const marta = await joinAsPlayer(browser, code, 'Marta');
    const leo = await joinAsPlayer(browser, code, 'Leo');
    await enableAudio(marta.page);
    await enableAudio(leo.page);
    await page.getByRole('button', { name: 'Empezar partida' }).click();

    await waitForOptions(marta.page);
    await expect(misVidas(marta.page).getByText('2 vidas')).toBeVisible();

    // Pierde una por no responder.
    await expect(misVidas(marta.page).getByText('1 vida')).toBeVisible({ timeout: 60_000 });

    await marta.page.reload();

    // Tras recargar sigue con una: recargar no resucita ni devuelve vidas.
    await expect(misVidas(marta.page).getByText('1 vida')).toBeVisible({ timeout: 40_000 });
    await expect(misVidas(marta.page).getByText('2 vidas')).toHaveCount(0);

    await marta.context.close();
    await leo.context.close();
  });
});
