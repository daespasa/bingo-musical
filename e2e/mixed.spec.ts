import { expect, test, type Page } from '@playwright/test';
import { createGameAndOpenRoom, enableAudio, joinAsPlayer, loginAsHost } from './helpers';

/** ¿Esta ronda es de opciones o de escribir? */
async function tipoDeRonda(page: Page): Promise<'opciones' | 'texto'> {
  const opciones = page.getByRole('button', { name: /^Opción A:/ });
  const campo = page.getByRole('textbox');
  await expect(opciones.or(campo).first()).toBeVisible({ timeout: 40_000 });
  return (await opciones.count()) > 0 ? 'opciones' : 'texto';
}

test.describe('Modo mixto', () => {
  test('el selector ofrece el modo y su reparto', async ({ page }) => {
    await loginAsHost(page);
    await page.goto('/dashboard/games/new');

    const mixto = page.getByRole('radio', { name: /Modo mixto/ });
    await expect(mixto).toBeEnabled();
    await expect(mixto).not.toContainText('Próximamente');

    await mixto.click();
    await expect(page.getByRole('group', { name: '¿Cómo se reparten las rondas?' })).toBeVisible();
    await expect(page.getByRole('radio', { name: /Equilibrado/ })).toBeVisible();
    await expect(page.getByRole('radio', { name: /Solo reconocimiento/ })).toBeVisible();

    // El bingo no entra en la mezcla y se dice explícitamente.
    await expect(page.getByText(/El bingo no entra en la mezcla/)).toBeVisible();
  });

  test('las rondas alternan entre opciones y respuesta libre', async ({ browser, page }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, {
      name: 'E2E mixto',
      mode: 'Modo mixto',
    });
    const marta = await joinAsPlayer(browser, code, 'Marta');
    await enableAudio(marta.page);
    await page.getByRole('button', { name: 'Empezar partida' }).click();

    // Se recorren varias rondas anotando de qué tipo es cada una.
    const tipos = new Set<string>();
    for (let ronda = 0; ronda < 4 && tipos.size < 2; ronda++) {
      tipos.add(await tipoDeRonda(marta.page));
      // Se salta a la siguiente desde el panel del anfitrión.
      await page.getByRole('button', { name: 'Omitir canción' }).click();
      await page.waitForTimeout(1500);
    }

    // Con el reparto equilibrado deben aparecer los dos tipos.
    expect(tipos.size).toBe(2);

    await marta.context.close();
  });

  test('una ronda de opciones del mixto tampoco filtra la solución', async ({ browser, page }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, {
      name: 'E2E mixto sin filtrar',
      mode: 'Modo mixto',
    });
    const marta = await joinAsPlayer(browser, code, 'Marta');
    await enableAudio(marta.page);
    await page.getByRole('button', { name: 'Empezar partida' }).click();

    await tipoDeRonda(marta.page);

    const html = await marta.page.content();
    for (const filtracion of ['correctIndex', 'correctText', 'isCorrect', 'expected']) {
      expect(html).not.toContain(filtracion);
    }

    await marta.context.close();
  });
});
