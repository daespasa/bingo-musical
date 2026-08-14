import { expect, test } from '@playwright/test';

test.describe('Portada', () => {
  test('cuenta qué es, qué hace falta y qué se juega', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Tu música');
    await expect(page.getByText(/comparte un código de seis letras/)).toBeVisible();

    // Los tres créditos son los tres pasos de montar una partida. Se acota al
    // <dt> de cada crédito porque «Tu música» también aparece, parcialmente,
    // en el rótulo.
    for (const etiqueta of ['Tu música', 'Su móvil', 'Vuestro juego']) {
      await expect(page.getByRole('term').getByText(etiqueta, { exact: true })).toBeVisible();
    }
    await expect(page.getByText(/Bingo, quiz, adivina la canción/)).toBeVisible();

    // Lo que el spec deja intacto sigue ahí.
    await expect(page.getByRole('link', { name: 'Crear partida' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Entrar con código' })).toBeVisible();
  });

  test('a 360 px no desborda y los créditos siguen legibles', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/');

    // Nada de scroll horizontal: el ancho del documento no supera el de la ventana.
    const desborda = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(desborda).toBe(false);

    await expect(page.getByText(/Bingo, quiz, adivina la canción/)).toBeVisible();
  });
});
