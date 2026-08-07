import { expect, test } from '@playwright/test';
import { loginAsHost } from './helpers';

test.describe('Cuenta y navegación', () => {
  test('el header marca en qué sección estás', async ({ page }) => {
    await loginAsHost(page);

    const partidas = page.getByRole('link', { name: 'Partidas' });
    await expect(partidas).toHaveAttribute('aria-current', 'page');

    await page.getByRole('link', { name: 'Música' }).click();
    await expect(page).toHaveURL(/\/dashboard\/music$/);
    await expect(page.getByRole('link', { name: 'Música' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(partidas).not.toHaveAttribute('aria-current', 'page');
  });

  test('el dashboard saluda y resume la situación', async ({ page }) => {
    await loginAsHost(page);
    await expect(page.getByText('Hola, Anfitrión Demo')).toBeVisible();
    await expect(page.getByRole('heading', { name: '¿Montamos una partida?' })).toBeVisible();
    await expect(page.getByText('Canciones')).toBeVisible();
    await expect(page.getByText('Ya jugadas')).toBeVisible();
  });

  test('se puede cambiar el nombre desde la cuenta', async ({ page }) => {
    await loginAsHost(page);
    await page.getByRole('link', { name: 'Tu cuenta' }).click();
    await expect(page).toHaveURL(/\/dashboard\/profile$/);

    const nuevo = `Anfitrión ${Date.now() % 10000}`;
    await page.getByLabel('Tu nombre').fill(nuevo);
    await page.getByRole('button', { name: 'Guardar nombre' }).click();
    await expect(page.getByText('Nombre guardado.')).toBeVisible();

    // El nombre nuevo se ve en la cabecera sin recargar
    await expect(page.getByRole('link', { name: 'Tu cuenta' })).toContainText(nuevo);

    // Se deja como estaba para no ensuciar las demás pruebas
    await page.getByLabel('Tu nombre').fill('Anfitrión Demo');
    await page.getByRole('button', { name: 'Guardar nombre' }).click();
    await expect(page.getByText('Nombre guardado.')).toBeVisible();
  });

  test('cerrar sesión en otros dispositivos informa de lo que ha hecho', async ({ page }) => {
    await loginAsHost(page);
    await page.goto('/dashboard/profile');
    await page.getByRole('button', { name: /Cerrar sesión en los demás/ }).click();
    await expect(page.getByText(/sesiones|ninguna otra sesión/)).toBeVisible();
    // La sesión actual sigue viva
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: '¿Montamos una partida?' })).toBeVisible();
  });
});
