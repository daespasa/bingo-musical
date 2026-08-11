import { expect, test } from '@playwright/test';
import {
  createGameAndOpenRoom,
  enableAudio,
  joinAsPlayer,
  loginAsHost,
  waitForRoundAcceptingMarks,
} from './helpers';

/** Escapa un título para poder buscarlo con expresión regular. */
function asPattern(title: string): RegExp {
  return new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
}

test.describe('Reglas del marcado', () => {
  test('una casilla fallada vuelve a estar disponible en la ronda siguiente', async ({
    browser,
    page,
  }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, {
      name: 'E2E reglas',
      snippetSeconds: '10',
    });

    const marta = await joinAsPlayer(browser, code, 'Marta');
    await enableAudio(marta.page);
    await page.getByRole('button', { name: 'Empezar partida' }).click();
    await waitForRoundAcceptingMarks(marta.page);

    // Solo una casilla puede ser la canción de la ronda, así que tocando dos
    // distintas se garantiza al menos un fallo sin saber cuál está sonando.
    const cells = marta.page.getByRole('gridcell');
    let failedTitle: string | null = null;
    for (let i = 0; i < 2; i++) {
      const cell = cells.nth(i);
      const title = (await cell.innerText()).split('\n')[0] ?? '';
      await cell.click();
      // El veredicto lo da el servidor, así que hay que esperarlo
      await expect(cell).toHaveAttribute('aria-label', /\((fallada|acertada)\)/);
      if ((await cell.getAttribute('aria-label'))?.includes('(fallada)')) {
        failedTitle = title;
        break;
      }
    }
    expect(failedTitle, 'ninguna de las dos casillas resultó fallada').not.toBeNull();

    const failedCell = marta.page.getByRole('gridcell', { name: asPattern(failedTitle!) });
    await expect(failedCell).toBeDisabled();

    // La ronda siguiente devuelve esa casilla al juego
    await expect(marta.page.getByText(/Ronda 2 de/)).toBeVisible({ timeout: 60_000 });
    await waitForRoundAcceptingMarks(marta.page);
    await expect(failedCell).toBeEnabled();
    await expect(failedCell).not.toHaveAttribute('aria-label', /\(fallada\)/);

    await marta.context.close();
  });

  test('un acierto no se borra al cambiar de ronda', async ({ browser, page }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, {
      name: 'E2E acierto',
      snippetSeconds: '10',
      // Cartón de 4×4: con 16 de las 20 pistas demo, la canción que suena está
      // en el cartón el 80 % de las rondas. Con 3×3 era el 45 % y la prueba
      // fallaba una de cada seis veces por pura mala suerte.
      cardSize: 4,
    });

    const marta = await joinAsPlayer(browser, code, 'Marta');
    await enableAudio(marta.page);
    await page.getByRole('button', { name: 'Empezar partida' }).click();

    // Se recorre el cartón hasta acertar: solo una casilla es la de la ronda
    let hitTitle: string | null = null;
    for (let round = 1; round <= 5 && !hitTitle; round++) {
      await waitForRoundAcceptingMarks(marta.page);
      const cells = marta.page.getByRole('gridcell');
      const total = await cells.count();
      for (let i = 0; i < total && !hitTitle; i++) {
        const cell = cells.nth(i);
        if (!(await cell.isEnabled())) continue;
        const title = (await cell.innerText()).split('\n')[0] ?? '';
        await cell.click();
        await expect(cell).toHaveAttribute('aria-label', /\((fallada|acertada)\)/);
        if ((await cell.getAttribute('aria-label'))?.includes('(acertada)')) {
          hitTitle = title;
        }
      }
      if (!hitTitle) {
        await expect(marta.page.getByText(new RegExp(`Ronda ${round + 1} de`))).toBeVisible({
          timeout: 60_000,
        });
      }
    }
    expect(hitTitle, 'no se acertó ninguna casilla en cinco rondas').not.toBeNull();

    const hitCell = marta.page.getByRole('gridcell', { name: asPattern(hitTitle!) });
    await expect(hitCell).toHaveAttribute('aria-label', /\(acertada\)/);

    // El acierto sobrevive al cambio de ronda, a diferencia del fallo
    await waitForRoundAcceptingMarks(marta.page);
    await expect(hitCell).toHaveAttribute('aria-label', /\(acertada\)/);
    await expect(hitCell).toBeDisabled();

    await marta.context.close();
  });
});
