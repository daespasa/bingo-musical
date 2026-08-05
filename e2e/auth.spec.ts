import { expect, test } from '@playwright/test';
import { DEMO_USER, loginAsHost } from './helpers';

test.describe('Autenticación y protección de rutas', () => {
  test('el dashboard redirige a login sin sesión', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login, sesión persistente tras recargar y logout', async ({ page }) => {
    await loginAsHost(page);
    await expect(page.getByText('Anfitrión Demo')).toBeVisible();

    // La sesión sobrevive a una recarga completa (cookie HttpOnly)
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('Anfitrión Demo')).toBeVisible();

    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('rechaza credenciales incorrectas', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo').fill(DEMO_USER.email);
    await page.getByLabel('Contraseña').fill('contraseña-incorrecta');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.locator('p[role="alert"]')).toContainText(/credenciales incorrectas/i);
  });

  test('registra una cuenta nueva y entra al dashboard', async ({ page }) => {
    const email = `e2e-${Date.now()}@bingo.local`;
    await page.goto('/register');
    await page.getByLabel('Nombre').fill('Jugador E2E');
    await page.getByLabel('Correo').fill(email);
    await page.getByLabel('Contraseña').fill('Prueba1234');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('la web funciona sin credenciales de Spotify', async ({ page }) => {
    await loginAsHost(page);
    await page.goto('/dashboard/music');
    await expect(page.getByText('Spotify no está configurado')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Crear partida con la colección demo' }),
    ).toBeVisible();
  });
});

test.describe('PWA', () => {
  test('sirve el manifest con los iconos y el service worker', async ({ page, request }) => {
    const manifest = await request.get('/manifest.webmanifest');
    expect(manifest.ok()).toBeTruthy();
    const body = (await manifest.json()) as {
      name: string;
      display: string;
      icons: Array<{ sizes: string; purpose?: string }>;
    };
    expect(body.name).toBe('Bingo Musical');
    expect(body.display).toBe('standalone');
    expect(body.icons.map((i) => i.sizes)).toContain('512x512');
    expect(body.icons.some((i) => i.purpose === 'maskable')).toBe(true);

    const sw = await request.get('/sw.js');
    expect(sw.ok()).toBeTruthy();

    // El service worker queda registrado al cargar la aplicación
    await page.goto('/');
    const registered = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return Boolean(reg);
    });
    expect(registered).toBe(true);
  });
});
