import { expect, test } from '@playwright/test';
import {
  createGameAndOpenRoom,
  enableAudio,
  joinAsPlayer,
  loginAsHost,
  waitForRoundAcceptingMarks,
} from './helpers';

/** Tanto la carátula original como la que sirve el optimizador de Next pasan por aquí. */
const esCaratula = (url: string) => url.includes('covers');

test.describe('Cartón con portadas', () => {
  test('la casilla se desenfoca hasta que se resuelve, y el título se lee siempre', async ({
    browser,
    page,
  }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, {
      name: 'E2E portadas',
      showArtwork: true,
      cardSize: 4,
    });
    const marta = await joinAsPlayer(browser, code, 'Marta');

    // El peso importa: son 16 carátulas en un móvil ajeno y una red de salón.
    let bytes = 0;
    let imagenes = 0;
    marta.page.on('response', (res) => {
      if (!esCaratula(res.url())) return;
      imagenes += 1;
      bytes += Number(res.headers()['content-length'] ?? 0);
    });

    await enableAudio(marta.page);
    await page.getByRole('button', { name: 'Empezar partida' }).click();
    await waitForRoundAcceptingMarks(marta.page);

    const cells = marta.page.getByRole('gridcell');
    const primera = cells.first();
    const titulo = (await primera.innerText()).split('\n')[0] ?? '';
    expect(titulo.length).toBeGreaterThan(0);
    await expect(primera.locator('img')).toHaveClass(/blur/);

    /*
     * Una casilla resuelta —acertada o fallada, da igual— enseña su carátula
     * nítida: el veredicto lo da el servidor, así que se espera a él.
     */
    await primera.click();
    await expect(primera).toHaveAttribute('aria-label', /\((fallada|acertada)\)/);
    await expect(primera.locator('img')).not.toHaveClass(/blur/);
    // El texto no desaparece nunca: la portada es un añadido, no un sustituto.
    await expect(primera).toContainText(titulo);

    expect(imagenes, 'no se pidió ninguna carátula').toBeGreaterThan(0);
    console.log(`Carátulas del cartón 4×4: ${imagenes} peticiones, ${bytes} bytes`);

    await marta.context.close();
  });

  test('sin la opción no se pide ninguna carátula', async ({ browser, page }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, { name: 'E2E sin portadas', cardSize: 4 });
    const marta = await joinAsPlayer(browser, code, 'Marta');

    const pedidas: string[] = [];
    marta.page.on('request', (req) => {
      if (esCaratula(req.url())) pedidas.push(req.url());
    });

    await enableAudio(marta.page);
    await page.getByRole('button', { name: 'Empezar partida' }).click();
    await waitForRoundAcceptingMarks(marta.page);
    await expect(marta.page.getByRole('gridcell').first()).toBeVisible();

    expect(pedidas, 'el cartón de solo texto no debe descargar carátulas').toEqual([]);

    await marta.context.close();
  });
});
