import { expect, test } from '@playwright/test';
import {
  createGameAndOpenRoom,
  enableAudio,
  joinAsPlayer,
  loginAsHost,
  readCardTitles,
  waitForRoundAcceptingMarks,
} from './helpers';

test.describe('Partida completa con dos jugadores', () => {
  test('recorre lobby, rondas, marcado, ranking, pausa y podio', async ({ browser, page }) => {
    // 1-3. Anfitrión inicia sesión, crea la partida y abre el lobby
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, { name: 'E2E partida completa' });
    await expect(page.getByText(code, { exact: true })).toBeVisible();

    // 4. Entran dos jugadores
    const marta = await joinAsPlayer(browser, code, 'Marta');
    const leo = await joinAsPlayer(browser, code, 'Leo');

    // El anfitrión los ve en el lobby
    await expect(page.getByText('Marta')).toBeVisible();
    await expect(page.getByText('Leo')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Jugadores \(2\)/ })).toBeVisible();

    // 6. Ambos activan el sonido
    await enableAudio(marta.page);
    await enableAudio(leo.page);

    // 7. El anfitrión empieza la partida
    await page.getByRole('button', { name: 'Empezar partida' }).click();

    // 5. Los cartones son distintos entre jugadores
    const cardMarta = await readCardTitles(marta.page);
    const cardLeo = await readCardTitles(leo.page);
    expect(cardMarta).toHaveLength(9);
    expect(cardLeo).toHaveLength(9);
    expect(cardMarta.join('|')).not.toBe(cardLeo.join('|'));
    // Y no repiten canción dentro del mismo cartón
    expect(new Set(cardMarta).size).toBe(cardMarta.length);

    // 8-9. Empieza a sonar el fragmento
    await waitForRoundAcceptingMarks(marta.page);

    // 10. Marta marca una casilla: el servidor decide si vale y la bloquea
    await marta.page.getByRole('gridcell').first().click();
    await expect(marta.page.getByRole('gridcell').first()).toBeDisabled();

    // 11. El ranking se actualiza en el panel del anfitrión
    await expect(page.getByRole('heading', { name: 'Ranking en vivo' })).toBeVisible();
    await expect(page.locator('li').filter({ hasText: 'Marta' }).first()).toBeVisible();

    // 12-13. Pausa y reanudación
    await page.getByRole('button', { name: 'Pausar' }).click();
    await expect(marta.page.getByText('Partida en pausa')).toBeVisible();
    await page.getByRole('button', { name: 'Reanudar' }).click();
    await expect(marta.page.getByText('Partida en pausa')).toBeHidden();

    // 14. Revelado manual y avance de ronda
    await page.getByRole('button', { name: 'Revelar' }).click();
    await expect(page.getByText('La canción era…')).toBeVisible();
    await page.getByRole('button', { name: 'Siguiente canción' }).click();
    await expect(page.getByText(/Ronda 2 de/)).toBeVisible();

    // 15. El anfitrión finaliza, confirma, y aparece el podio en todos lados
    await page.getByRole('button', { name: 'Finalizar' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('button', { name: 'Terminar y ver resultados' }).click();

    await expect(page.getByText('¡Fin de la partida!')).toBeVisible();
    await expect(marta.page.getByText('¡Fin de la partida!')).toBeVisible();
    await expect(leo.page.getByText('¡Fin de la partida!')).toBeVisible();
    await expect(marta.page.getByText('Clasificación final')).toBeVisible({ timeout: 20_000 });

    await marta.context.close();
    await leo.context.close();
  });

  test('la reconexión conserva el cartón y la puntuación', async ({ browser, page }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, { name: 'E2E reconexión' });
    const ana = await joinAsPlayer(browser, code, 'Ana');
    await enableAudio(ana.page);
    await page.getByRole('button', { name: 'Empezar partida' }).click();

    const before = await readCardTitles(ana.page);
    await waitForRoundAcceptingMarks(ana.page);
    const firstCell = ana.page.getByRole('gridcell').first();
    await firstCell.click();
    await expect(firstCell).toHaveAttribute('aria-label', /\((fallada|acertada)\)/);
    const wasWrong = ((await firstCell.getAttribute('aria-label')) ?? '').includes('(fallada)');
    const score = await ana.page.getByLabel('Tu puntuación').innerText();

    // Recarga completa: la sesión de invitado vive en localStorage
    await ana.page.reload();
    const after = await readCardTitles(ana.page);
    expect(after).toEqual(before);
    // La puntuación la manda el servidor, así que sobrevive a la recarga
    await expect(ana.page.getByLabel('Tu puntuación')).toHaveText(score);

    const firstAfterReload = ana.page.getByRole('gridcell').first();
    if (wasWrong) {
      // Un fallo es de su ronda: la casilla vuelve a estar en juego
      await expect(firstAfterReload).toBeEnabled();
    } else {
      // Un acierto es definitivo
      await expect(firstAfterReload).toBeDisabled();
    }

    await ana.context.close();
  });

  test('rechaza alias duplicados en la misma sala', async ({ browser, page }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, { name: 'E2E alias' });
    const primera = await joinAsPlayer(browser, code, 'Repetida');

    const context = await browser.newContext();
    const segunda = await context.newPage();
    await segunda.goto(`/join/${code}`);
    await segunda.getByLabel('Tu alias').fill('repetida');
    await segunda.getByRole('button', { name: '¡A jugar!' }).click();
    await expect(segunda.locator('p[role="alert"]')).toContainText(/alias ya está en uso/i);

    await primera.context.close();
    await context.close();
  });

  test('el jugador puede cantar línea y el servidor la rechaza si no la tiene', async ({
    browser,
    page,
  }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, { name: 'E2E línea' });
    const ana = await joinAsPlayer(browser, code, 'Ana');
    await enableAudio(ana.page);
    await page.getByRole('button', { name: 'Empezar partida' }).click();
    await expect(ana.page.getByRole('grid', { name: 'Cartón de bingo' })).toBeVisible();

    await ana.page.getByRole('button', { name: '¡Línea!' }).click();
    await expect(ana.page.getByRole('status')).toContainText(/no tienes línea completa/i);

    await ana.context.close();
  });
});
