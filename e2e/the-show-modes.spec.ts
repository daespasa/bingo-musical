import { expect, test } from '@playwright/test';
import { createGameAndOpenRoom, enableAudio, joinAsPlayer, loginAsHost } from './helpers';

test.describe('El espectáculo en cada modo', () => {
  test('el resumen del quiz cuenta aciertos, no cartones', async ({ browser, page }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, {
      name: 'E2E show quiz',
      mode: 'Quiz musical',
    });
    const marta = await joinAsPlayer(browser, code, 'Marta');
    await enableAudio(marta.page);
    await page.getByRole('button', { name: 'Empezar partida' }).click();

    await expect(marta.page.getByRole('button', { name: /^Opción A:/ })).toBeEnabled({
      timeout: 40_000,
    });
    await marta.page.getByRole('button', { name: /^Opción A:/ }).click();

    // Al cerrarse la ronda aparece el resumen, y habla de acertar.
    await expect(marta.page.getByText('Cómo ha ido la ronda')).toBeVisible({ timeout: 60_000 });
    await expect(marta.page.getByText(/La acertaron|No la acertó nadie/)).toBeVisible();

    // Y nunca en lenguaje de bingo.
    await expect(marta.page.getByText('No la tenía nadie')).toHaveCount(0);

    await marta.context.close();
  });

  test('el resumen de supervivencia cuenta las caídas', async ({ browser, page }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, {
      name: 'E2E show supervivencia',
      mode: 'Supervivencia',
      lives: 1,
    });
    const marta = await joinAsPlayer(browser, code, 'Marta');
    const leo = await joinAsPlayer(browser, code, 'Leo');
    await enableAudio(marta.page);
    await enableAudio(leo.page);
    await page.getByRole('button', { name: 'Empezar partida' }).click();

    // Nadie responde: con una vida, todos caen en la primera ronda.
    await expect(marta.page.getByText('Cómo ha ido la ronda')).toBeVisible({ timeout: 60_000 });
    await expect(marta.page.getByText(/se queda sin vidas|Caen /)).toBeVisible();

    await marta.context.close();
    await leo.context.close();
  });

  test('el resumen del bingo sigue hablando de cartones', async ({ browser, page }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, { name: 'E2E show bingo' });
    const marta = await joinAsPlayer(browser, code, 'Marta');
    await enableAudio(marta.page);
    await page.getByRole('button', { name: 'Empezar partida' }).click();

    await expect(marta.page.getByText('Cómo ha ido la ronda')).toBeVisible({ timeout: 60_000 });
    // El bingo no cambia: se «tiene» la canción en el cartón.
    await expect(marta.page.getByText(/La tenían|No la tenía nadie/)).toBeVisible();

    await marta.context.close();
  });

  test('el anfitrión puede convocar la revancha al terminar', async ({ browser, page }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, { name: 'E2E revancha' });
    const marta = await joinAsPlayer(browser, code, 'Marta');
    await enableAudio(marta.page);
    await page.getByRole('button', { name: 'Empezar partida' }).click();
    await expect(page.getByRole('button', { name: 'Finalizar' })).toBeVisible({ timeout: 40_000 });

    // Se termina a mano para llegar a la ceremonia sin jugar 20 rondas.
    await page.getByRole('button', { name: 'Finalizar' }).click();
    await page.getByRole('button', { name: 'Terminar y ver resultados' }).click();

    const revancha = page.getByRole('button', { name: 'Jugar revancha' });
    await expect(revancha).toBeVisible({ timeout: 40_000 });
    await revancha.click();

    // Lleva a una sala **distinta** de la anterior: el historial de esta
    // partida queda intacto. Se espera al cambio de URL en vez de leerla al
    // vuelo, porque la navegación tarda en completarse.
    await page.waitForURL(
      (url) => /\/room\/[A-Z0-9]{6}\/host/.test(url.pathname) && !url.pathname.includes(code),
      { timeout: 40_000 },
    );

    // Y la sala nueva está en su lobby, lista para volver a jugar.
    await expect(page.getByRole('button', { name: 'Empezar partida' })).toBeVisible({
      timeout: 20_000,
    });

    await marta.context.close();
  });
});
