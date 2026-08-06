import { expect, test } from '@playwright/test';
import { createGameAndOpenRoom, loginAsHost } from './helpers';

test.describe('Entrada por código', () => {
  test('el código se teclea en casillas, se limpia y lleva a la sala', async ({
    browser,
    page,
  }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, { name: 'E2E código' });

    const guest = await browser.newContext();
    const guestPage = await guest.newPage();
    await guestPage.goto('/join');

    const input = guestPage.getByLabel('Código de sala');

    // Los caracteres ambiguos y los separadores no llegan al valor
    await input.fill('0o1il-');
    await expect(input).toHaveValue('');

    // El código completo entra en la sala sin pulsar nada más
    await input.fill(code.toLowerCase());
    await expect(guestPage).toHaveURL(new RegExp(`/join/${code}$`));
    await expect(guestPage.getByLabel('Tu alias')).toBeVisible();

    await guest.close();
  });

  test('un código inexistente avisa en lugar de dejar la pantalla en blanco', async ({ page }) => {
    await page.goto('/join');
    await page.getByLabel('Código de sala').fill('ZZZZZZ');
    await expect(page).toHaveURL(/\/join\/ZZZZZZ$/);
    // `p[role=alert]`: el anunciador de rutas de Next también expone `alert`
    await expect(page.locator('p[role="alert"]')).toContainText('Sala no encontrada');
  });
});
