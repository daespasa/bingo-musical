import { expect, test } from '@playwright/test';

test.describe('Tema claro/oscuro', () => {
  test('el tema oscuro persiste y no parpadea al recargar', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Oscuro' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // `waitUntil: 'commit'` resuelve en cuanto llega la respuesta HTTP, antes
    // de que React hidrate: el script inline del layout ya debe haber
    // aplicado la clase, sin depender de la hidratación.
    await page.goto('/', { waitUntil: 'commit' });
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('en automático el tema sigue al sistema sin recargar', async ({ page }) => {
    await page.goto('/');

    // «Automático» es el estado por defecto: no hace falta elegirlo.
    await expect(page.getByRole('button', { name: 'Automático' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });
});
