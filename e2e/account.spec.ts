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

test.describe('Sesión caducada', () => {
  test('con la cookie caducada te devuelve al login en vez de dar errores', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsHost(page, { fresh: true });

    // Se falsea la cookie: sigue estando, pero ya no vale. Es lo que pasa
    // cuando caduca o cuando se cierra la sesión desde otro dispositivo.
    const cookies = await context.cookies();
    const session = cookies.find((c) => c.name === 'bingo_session');
    expect(session, 'no se encontró la cookie de sesión').toBeTruthy();
    await context.clearCookies();
    await context.addCookies([{ ...session!, value: 'ya-no-vale' }]);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    await expect(page.getByText(/Tu sesión ha caducado/)).toBeVisible();

    await context.close();
  });

  test('cerrar sesión en otro dispositivo echa al primero', async ({ browser }) => {
    // Sesiones propias: con la compartida ambos serían la misma y no habría
    // nada que cerrar
    const primero = await browser.newContext();
    const paginaPrimero = await primero.newPage();
    await loginAsHost(paginaPrimero, { fresh: true });

    const segundo = await browser.newContext();
    const paginaSegundo = await segundo.newPage();
    await loginAsHost(paginaSegundo, { fresh: true });

    // El segundo cierra el resto de sesiones
    await paginaSegundo.goto('/dashboard/profile');
    await paginaSegundo.getByRole('button', { name: /Cerrar sesión en los demás/ }).click();
    await expect(paginaSegundo.getByText(/sesiones|ninguna otra sesión/)).toBeVisible();

    // El primero se entera en cuanto vuelve a pedir algo
    await paginaPrimero.goto('/dashboard');
    await expect(paginaPrimero).toHaveURL(/\/login/, { timeout: 15_000 });

    await primero.close();
    await segundo.close();
  });
});
