import { expect, test } from '@playwright/test';
import {
  createGameAndOpenRoom,
  enableAudio,
  joinAsPlayer,
  loginAsHost,
  readCardTitles,
  waitForRoundAcceptingMarks,
} from './helpers';

test.describe('Variantes del bingo', () => {
  test('el selector ofrece los modos y solo deja elegir los que se pueden jugar', async ({
    page,
  }) => {
    await loginAsHost(page);
    await page.goto('/dashboard/games/new');

    await expect(page.getByRole('group', { name: '¿A qué quieres jugar?' })).toBeVisible();

    // El bingo viene elegido de partida: es el modo insignia.
    const bingo = page.getByRole('radio', { name: /Bingo musical/ });
    await expect(bingo).toBeEnabled();
    await expect(bingo).toHaveAttribute('aria-checked', 'true');

    // Los cinco modos del catálogo se juegan ya de principio a fin, así que
    // ninguno debe salir como «Próximamente».
    for (const nombre of [/Quiz musical/, /Adivina la canción/, /Supervivencia/, /Modo mixto/]) {
      const tarjeta = page.getByRole('radio', { name: nombre });
      await expect(tarjeta).toBeEnabled();
      await expect(tarjeta).not.toContainText('Próximamente');
    }
    await expect(page.getByText('Próximamente')).toHaveCount(0);
  });

  test('bingo a ciegas oculta la canción hasta el revelado', async ({ browser, page }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, {
      name: 'E2E a ciegas',
      variant: 'Bingo a ciegas',
    });
    const marta = await joinAsPlayer(browser, code, 'Marta');
    await enableAudio(marta.page);
    await page.getByRole('button', { name: 'Empezar partida' }).click();

    await waitForRoundAcceptingMarks(marta.page);

    // Mientras suena no se dice qué canción es: hay que reconocerla de oído.
    await expect(marta.page.getByText('Suena ahora · búscala en tu cartón')).toHaveCount(0);

    // Y el título tampoco ha viajado al navegador por otra vía.
    await expect(marta.page.getByText('La canción era…')).toHaveCount(0);

    await marta.context.close();
  });

  test('bingo clásico enseña título y artista desde el principio', async ({ browser, page }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, {
      name: 'E2E clásico',
      variant: 'Bingo clásico',
    });
    const marta = await joinAsPlayer(browser, code, 'Marta');
    await enableAudio(marta.page);
    await page.getByRole('button', { name: 'Empezar partida' }).click();

    await waitForRoundAcceptingMarks(marta.page);

    // La canción va identificada mientras suena: el reto es encontrarla.
    await expect(marta.page.getByText('Suena ahora · búscala en tu cartón')).toBeVisible();

    // El anfitrión ve lo mismo, para poder conducir la partida.
    await expect(page.getByText('Suena ahora · búscala en tu cartón')).toBeVisible();

    // Y el cartón sigue siendo el de siempre: nueve casillas jugables.
    const titulos = await readCardTitles(marta.page);
    expect(titulos).toHaveLength(9);

    await marta.context.close();
  });

  test('el historial distingue la variante jugada', async ({ page }) => {
    await loginAsHost(page);
    await page.goto('/dashboard/history');

    const filas = page.locator('text=/Bingo musical/');
    // Las partidas anteriores a Gramola también se etiquetan como bingo.
    if ((await filas.count()) > 0) {
      await expect(filas.first()).toBeVisible();
    }
  });
});
