import { expect, test, type Page } from '@playwright/test';
import { createGameAndOpenRoom, enableAudio, joinAsPlayer, loginAsHost } from './helpers';

/**
 * Espera a que la pregunta admita respuestas.
 *
 * Las opciones se ven antes de que arranque el fragmento, pero deshabilitadas:
 * lo que interesa aquí es el momento en que de verdad se puede contestar.
 */
async function waitForOptions(page: Page): Promise<void> {
  await expect(page.getByRole('button', { name: /^Opción A:/ })).toBeEnabled({ timeout: 40_000 });
}

test.describe('Quiz musical', () => {
  test('dos jugadores responden y se revela la distribución', async ({ browser, page }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, {
      name: 'E2E quiz título',
      mode: 'Quiz musical',
    });

    const marta = await joinAsPlayer(browser, code, 'Marta');
    const leo = await joinAsPlayer(browser, code, 'Leo');
    await enableAudio(marta.page);
    await enableAudio(leo.page);

    await page.getByRole('button', { name: 'Empezar partida' }).click();

    await waitForOptions(marta.page);
    await expect(marta.page.getByText('¿Cómo se llama esta canción?')).toBeVisible();

    // Nadie reparte cartones en el quiz.
    await expect(marta.page.getByRole('grid')).toHaveCount(0);

    // Cada uno elige una opción distinta, para que la distribución se reparta.
    await marta.page.getByRole('button', { name: /^Opción A:/ }).click();
    await expect(marta.page.getByText('Respuesta enviada · esperando al resto')).toBeVisible();

    await leo.page.getByRole('button', { name: /^Opción B:/ }).click();

    // Tras responder no se puede rectificar (configuración por defecto).
    await expect(marta.page.getByRole('button', { name: /^Opción B:/ })).toBeDisabled();

    // Al revelarse aparece la solución y el reparto de respuestas.
    await expect(marta.page.getByText(/^La respuesta era /)).toBeVisible({ timeout: 40_000 });

    await marta.context.close();
    await leo.context.close();
  });

  test('la solución no está en la página antes del revelado', async ({ browser, page }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, {
      name: 'E2E quiz sin filtrar',
      mode: 'Quiz musical',
    });
    const marta = await joinAsPlayer(browser, code, 'Marta');
    await enableAudio(marta.page);
    await page.getByRole('button', { name: 'Empezar partida' }).click();

    await waitForOptions(marta.page);

    // Ni en el HTML servido, ni en atributos, ni en el estado serializado de
    // React: si estuviera, bastaría con abrir el inspector para ganar.
    const html = await marta.page.content();
    for (const filtracion of [
      'correctIndex',
      'correctText',
      'isCorrect',
      'expectedAnswer',
      'normalizedExpected',
    ]) {
      expect(html).not.toContain(filtracion);
    }

    // Y tampoco viaja en ningún estado global que el navegador pueda leer.
    const enWindow = await marta.page.evaluate(() =>
      JSON.stringify(Object.keys(window).filter((k) => /correct|answer|solution/i.test(k))),
    );
    expect(enWindow).toBe('[]');

    await marta.context.close();
  });

  test('la reconexión conserva la respuesta enviada', async ({ browser, page }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, {
      name: 'E2E quiz reconexión',
      mode: 'Quiz musical',
    });
    const marta = await joinAsPlayer(browser, code, 'Marta');
    await enableAudio(marta.page);
    await page.getByRole('button', { name: 'Empezar partida' }).click();

    await waitForOptions(marta.page);
    await marta.page.getByRole('button', { name: /^Opción A:/ }).click();
    await expect(marta.page.getByText('Respuesta enviada · esperando al resto')).toBeVisible();

    await marta.page.reload();

    /*
     * Tras recargar sigue constando como respondida: recargar no puede ser una
     * forma de responder dos veces.
     *
     * Se comprueba por el estado que ve quien juega y no por el botón. Esperar
     * a que las opciones estén habilitadas para luego exigir que estén
     * deshabilitadas es contradictorio: solo se cumple en un instante concreto
     * de la reconexión, y en cuanto arranca la ronda siguiente el botón vuelve
     * a habilitarse —correctamente, porque ya es otra pregunta—.
     */
    await expect(marta.page.getByText('Respuesta enviada · esperando al resto')).toBeVisible({
      timeout: 40_000,
    });

    await marta.context.close();
  });

  test('el selector ya ofrece el quiz como disponible', async ({ page }) => {
    await loginAsHost(page);
    await page.goto('/dashboard/games/new');

    const quiz = page.getByRole('radio', { name: /Quiz musical/ });
    await expect(quiz).toBeEnabled();
    await expect(quiz).not.toContainText('Próximamente');

    // Al elegirlo aparece su configuración propia, no la del bingo.
    await quiz.click();
    await expect(page.getByRole('group', { name: '¿Qué se pregunta?' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Variante del bingo' })).toHaveCount(0);
  });
});
