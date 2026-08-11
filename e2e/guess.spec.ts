import { expect, test, type Page } from '@playwright/test';
import { createGameAndOpenRoom, enableAudio, joinAsPlayer, loginAsHost } from './helpers';

/** Espera a que el campo de respuesta admita escritura. */
async function waitForInput(page: Page): Promise<void> {
  await expect(page.getByRole('textbox')).toBeEnabled({ timeout: 40_000 });
}

test.describe('Adivina la canción', () => {
  test('el selector ofrece el modo y su configuración propia', async ({ page }) => {
    await loginAsHost(page);
    await page.goto('/dashboard/games/new');

    const adivina = page.getByRole('radio', { name: /Adivina la canción/ });
    await expect(adivina).toBeEnabled();
    await expect(adivina).not.toContainText('Próximamente');

    await adivina.click();
    await expect(page.getByRole('group', { name: '¿Qué hay que escribir?' })).toBeVisible();
    await expect(page.getByLabel('Intentos por ronda')).toBeVisible();
    // La configuración del bingo y la del quiz no pintan nada aquí.
    await expect(page.getByRole('group', { name: 'Variante del bingo' })).toHaveCount(0);
    await expect(page.getByRole('group', { name: '¿Qué se pregunta?' })).toHaveCount(0);
  });

  test('una respuesta incorrecta se rechaza y la solución se revela al cerrar', async ({
    browser,
    page,
  }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, {
      name: 'E2E adivina',
      mode: 'Adivina la canción',
    });
    const marta = await joinAsPlayer(browser, code, 'Marta');
    await enableAudio(marta.page);
    await page.getByRole('button', { name: 'Empezar partida' }).click();

    await waitForInput(marta.page);
    await expect(
      marta.page.getByRole('heading', { name: '¿Cómo se llama esta canción?' }),
    ).toBeVisible();

    // Una respuesta claramente equivocada.
    await marta.page.getByRole('textbox').fill('Una canción que no existe');
    await marta.page.getByRole('textbox').press('Enter');

    // El intento queda registrado, pero NO se dice si ha acertado.
    await expect(marta.page.getByText('Una canción que no existe')).toBeVisible();
    await expect(marta.page.getByText(/Sin intentos/)).toBeVisible();

    // Solo al revelarse aparece la solución.
    // Margen amplio: entre precarga, programación, fragmento y ventana de
    // respuesta, una ronda tarda bastante, y con la máquina cargada más.
    await expect(marta.page.getByText(/^La respuesta era /)).toBeVisible({ timeout: 90_000 });
    await expect(marta.page.getByText('No la reconoció nadie')).toBeVisible();

    await marta.context.close();
  });

  test('la solución no está en la página antes del revelado', async ({ browser, page }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, {
      name: 'E2E adivina sin filtrar',
      mode: 'Adivina la canción',
    });
    const marta = await joinAsPlayer(browser, code, 'Marta');
    await enableAudio(marta.page);
    await page.getByRole('button', { name: 'Empezar partida' }).click();

    await waitForInput(marta.page);

    const html = await marta.page.content();
    for (const filtracion of ['expected', 'correctText', 'normalizedExpected', 'isCorrect']) {
      expect(html).not.toContain(filtracion);
    }

    await marta.context.close();
  });

  test('la reconexión conserva los intentos gastados', async ({ browser, page }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, {
      name: 'E2E adivina reconexión',
      mode: 'Adivina la canción',
    });
    const marta = await joinAsPlayer(browser, code, 'Marta');
    await enableAudio(marta.page);
    await page.getByRole('button', { name: 'Empezar partida' }).click();

    await waitForInput(marta.page);
    await marta.page.getByRole('textbox').fill('Respuesta gastada');
    await marta.page.getByRole('textbox').press('Enter');
    await expect(marta.page.getByText('Respuesta gastada')).toBeVisible();

    await marta.page.reload();

    // El intento sigue gastado: recargar no devuelve intentos.
    await expect(marta.page.getByText('Respuesta gastada')).toBeVisible({ timeout: 40_000 });

    await marta.context.close();
  });
});
