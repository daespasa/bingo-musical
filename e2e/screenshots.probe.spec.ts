import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { createGameAndOpenRoom, enableAudio, joinAsPlayer, loginAsHost } from './helpers';

/**
 * Genera las capturas del README.
 *
 * No forma parte de la suite: es una herramienta, y por eso lleva `.probe.`
 * (ver `testIgnore` en `playwright.config.ts`). Se lanza a mano:
 *
 *     PW_PROBE=1 pnpm exec playwright test e2e/screenshots.probe.spec.ts
 *
 * Las capturas se escriben en `docs/screenshots/`. Se toman de la aplicación
 * real, con datos demo, para que no puedan quedarse mintiendo respecto a la
 * interfaz.
 */

const DIR = 'docs/screenshots';
const MOVIL = { width: 420, height: 900 };
const ESCRITORIO = { width: 1280, height: 800 };

test.beforeAll(() => mkdirSync(DIR, { recursive: true }));

async function captura(page: Page, nombre: string): Promise<void> {
  // Sin animaciones: una captura con el disco a medio girar se ve como un
  // fallo de renderizado, no como una firma.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${DIR}/${nombre}.png` });
}

test.describe('Capturas del README', () => {
  test('portada y panel', async ({ page }) => {
    await page.setViewportSize(ESCRITORIO);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await captura(page, '01-portada');

    await loginAsHost(page);
    await captura(page, '02-dashboard');

    await page.goto('/dashboard/games/new');
    await expect(page.getByRole('group', { name: '¿A qué quieres jugar?' })).toBeVisible();
    await captura(page, '03-selector-de-modo');
  });

  test('bingo: cartón, proyector y ceremonia', async ({ browser, page }) => {
    await page.setViewportSize(ESCRITORIO);
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, {
      name: 'Fiesta del viernes',
      cardSize: 4,
    });
    await captura(page, '04-lobby-anfitrion');

    const marta = await joinAsPlayer(browser, code, 'Marta');
    const leo = await joinAsPlayer(browser, code, 'Leo');
    await marta.page.setViewportSize(MOVIL);
    await enableAudio(marta.page);
    await enableAudio(leo.page);

    const proyector = await browser.newContext({ viewport: ESCRITORIO });
    const pantalla = await proyector.newPage();
    await pantalla.goto(`/room/${code}/screen`);

    await page.getByRole('button', { name: 'Empezar partida' }).click();
    await expect(marta.page.getByRole('grid')).toBeVisible({ timeout: 40_000 });
    await captura(marta.page, '05-carton-jugador');
    await captura(pantalla, '06-proyector');

    await page.getByRole('button', { name: 'Finalizar' }).click();
    await page.getByRole('button', { name: 'Terminar y ver resultados' }).click();
    await expect(page.getByRole('heading', { name: /Fin de la partida/ })).toBeVisible({
      timeout: 30_000,
    });
    // La ceremonia se revela por pasos; se espera al último.
    await expect(page.getByText('Clasificación final')).toBeVisible({ timeout: 20_000 });
    await captura(page, '07-ceremonia');

    await marta.context.close();
    await leo.context.close();
    await proyector.close();
  });

  test('quiz y adivina en el móvil', async ({ browser, page }) => {
    await page.setViewportSize(ESCRITORIO);
    await loginAsHost(page);

    const quiz = await createGameAndOpenRoom(page, {
      name: 'Quiz de los 2000',
      mode: 'Quiz musical',
    });
    const jugadora = await joinAsPlayer(browser, quiz, 'Marta');
    await jugadora.page.setViewportSize(MOVIL);
    await enableAudio(jugadora.page);
    await page.getByRole('button', { name: 'Empezar partida' }).click();
    await expect(jugadora.page.getByRole('button', { name: /^Opción A:/ })).toBeEnabled({
      timeout: 40_000,
    });
    await captura(jugadora.page, '08-quiz-opciones');

    // Con la respuesta enviada y revelada se ve el reparto.
    await jugadora.page.getByRole('button', { name: /^Opción A:/ }).click();
    await expect(jugadora.page.getByText(/^La respuesta era /)).toBeVisible({ timeout: 90_000 });
    await captura(jugadora.page, '09-quiz-distribucion');
    await jugadora.context.close();

    const adivina = await createGameAndOpenRoom(page, {
      name: 'Adivina la canción',
      mode: 'Adivina la canción',
    });
    const escribiendo = await joinAsPlayer(browser, adivina, 'Leo');
    await escribiendo.page.setViewportSize(MOVIL);
    await enableAudio(escribiendo.page);
    await page.getByRole('button', { name: 'Empezar partida' }).click();
    await expect(escribiendo.page.getByRole('textbox')).toBeEnabled({ timeout: 40_000 });
    await captura(escribiendo.page, '10-adivina');
    await escribiendo.context.close();
  });

  test('supervivencia: vidas', async ({ browser, page }) => {
    await page.setViewportSize(ESCRITORIO);
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, {
      name: 'Supervivencia',
      mode: 'Supervivencia',
      lives: 3,
    });
    const marta = await joinAsPlayer(browser, code, 'Marta');
    const leo = await joinAsPlayer(browser, code, 'Leo');
    await marta.page.setViewportSize(MOVIL);
    await enableAudio(marta.page);
    await enableAudio(leo.page);
    await page.getByRole('button', { name: 'Empezar partida' }).click();

    await expect(marta.page.getByRole('status', { name: 'Tus vidas' })).toBeVisible({
      timeout: 40_000,
    });
    await captura(marta.page, '11-supervivencia-vidas');

    await marta.context.close();
    await leo.context.close();
  });
});
