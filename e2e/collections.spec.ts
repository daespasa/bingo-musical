import { expect, test } from '@playwright/test';
import { loginAsHost } from './helpers';

/**
 * Gestión de colecciones. No toca Spotify a propósito: todo esto tiene que
 * funcionar sin credenciales, que es como corre la integración continua.
 */
test.describe('Gestionar colecciones', () => {
  test('crear, renombrar y borrar una colección propia', async ({ page }) => {
    await loginAsHost(page);
    await page.goto('/dashboard/music');

    const nombre = `Prueba ${Date.now()}`;
    await page.getByLabel('Nombre de la colección nueva').fill(nombre);
    await page.getByRole('button', { name: 'Crear vacía' }).click();

    // Se abre la colección recién creada
    await expect(page).toHaveURL(/\/dashboard\/collections\/[0-9a-f-]+$/);
    await expect(page.getByRole('heading', { name: nombre })).toBeVisible();
    await expect(page.getByText('Todavía no tiene ninguna')).toBeVisible();

    // Renombrar
    const renombrada = `${nombre} editada`;
    await page.getByLabel('Nombre').fill(renombrada);
    await page.getByLabel('Descripción').fill('Para la fiesta del sábado');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByRole('heading', { name: renombrada })).toBeVisible();

    // Borrar, con su confirmación
    await page.getByRole('button', { name: 'Borrar esta colección' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('button', { name: 'Borrar la colección' }).click();

    await expect(page).toHaveURL(/\/dashboard\/music$/);
    await expect(page.getByText(renombrada)).toBeHidden();
  });

  test('la colección de la aplicación se ve pero no se puede cambiar', async ({ page }) => {
    await loginAsHost(page);
    await page.goto('/dashboard/music');

    await page
      .getByRole('link', { name: /Colección Demo/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/collections\/[0-9a-f-]+$/);

    await expect(page.getByText('la mantiene la aplicación')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Borrar esta colección' })).toHaveCount(0);
    // Tampoco aparecen los controles de cada canción
    await expect(page.getByRole('button', { name: /^Quitar / })).toHaveCount(0);
  });

  test('copiar la colección de la aplicación deja quitar y reordenar canciones', async ({
    page,
  }) => {
    await loginAsHost(page);
    await page.goto('/dashboard/music');
    await page
      .getByRole('link', { name: /Colección Demo/ })
      .first()
      .click();

    await page.getByRole('button', { name: 'Hacer una copia editable' }).click();
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeVisible();

    const rows = page.getByRole('listitem');
    const before = await page.locator('li .font-medium').allInnerTexts();
    expect(before.length).toBeGreaterThan(2);

    // Bajar la primera canción la intercambia con la segunda
    await page.getByRole('button', { name: `Bajar ${before[0]}` }).click();
    await expect(page.locator('li .font-medium').first()).toHaveText(before[1]!);

    // Quitar una canción la saca de la lista y no deja huecos
    const toRemove = before[1]!;
    await page.getByRole('button', { name: `Quitar ${toRemove}` }).click();
    await expect(page.getByRole('button', { name: `Quitar ${toRemove}` })).toHaveCount(0);
    await expect(rows).toHaveCount(before.length - 1);

    // Y el cambio persiste al recargar, que es lo que prueba que se guardó
    await page.reload();
    await expect(page.locator('li .font-medium').first()).toHaveText(before[0]!);

    await page.getByRole('button', { name: 'Borrar esta colección' }).click();
    await page.getByRole('button', { name: 'Borrar la colección' }).click();
    await expect(page).toHaveURL(/\/dashboard\/music$/);
  });
});
