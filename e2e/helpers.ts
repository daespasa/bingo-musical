import type { Browser, BrowserContext, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export const DEMO_USER = { email: 'demo@bingo.local', password: 'Demo1234!' };

/** Inicia sesión como el anfitrión demo y deja la página en el dashboard. */
export async function loginAsHost(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Correo').fill(DEMO_USER.email);
  await page.getByLabel('Contraseña').fill(DEMO_USER.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

/**
 * Crea una partida con la colección demo y ajustes rápidos, abre la sala en
 * modo remoto y devuelve su código.
 */
export async function createGameAndOpenRoom(
  page: Page,
  options: { name: string; snippetSeconds?: '10' | '15'; autoReveal?: boolean } = {
    name: 'E2E',
  },
): Promise<string> {
  await page.goto('/dashboard/games/new');
  await page.getByLabel('Nombre de la partida').fill(options.name);
  await page.getByRole('button', { name: /Colección Demo/ }).click();
  await page.getByLabel('Duración del fragmento (s)').selectOption(options.snippetSeconds ?? '10');
  await page.getByLabel('Tiempo extra de respuesta (s)').selectOption('5');
  await page.getByLabel('Pausa de resultados entre rondas (s)').selectOption('3');
  if (options.autoReveal === false) {
    await page.getByRole('checkbox', { name: /Revelar la canción automáticamente/ }).uncheck();
  }
  await page.getByRole('button', { name: 'Crear partida' }).click();
  await expect(page).toHaveURL(/\/dashboard\/games\/[0-9a-f-]+$/);

  await page.getByRole('button', { name: /Abrir sala \(modo remoto\)/ }).click();
  await expect(page).toHaveURL(/\/room\/[A-Z0-9]{6}\/host/);

  const code = page.url().match(/\/room\/([A-Z0-9]{6})\//)?.[1];
  if (!code) throw new Error('No se pudo leer el código de sala de la URL');
  return code;
}

/** Abre un contexto aislado (jugador invitado) y entra en la sala. */
export async function joinAsPlayer(
  browser: Browser,
  code: string,
  alias: string,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/join/${code}`);
  await page.getByLabel('Tu alias').fill(alias);
  await page.getByRole('button', { name: '¡A jugar!' }).click();
  await expect(page).toHaveURL(new RegExp(`/room/${code}/play`));
  await expect(page.getByText('Esperando a que el anfitrión empiece')).toBeVisible();
  return { context, page };
}

/** Pulsa «Activar sonido» y espera la confirmación. */
export async function enableAudio(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Activar sonido' }).click();
  await expect(page.getByText('Sonido listo')).toBeVisible();
}

/**
 * Espera a que la ronda acepte marcas: el motor solo las valida en las
 * fases PLAYING y ANSWER_WINDOW, no mientras precarga o está programada.
 */
export async function waitForRoundAcceptingMarks(page: Page): Promise<void> {
  await expect(
    page.getByText(/Suena la canción|Escucha…|Últimos segundos para marcar/),
  ).toBeVisible({ timeout: 30_000 });
}

/** Devuelve los títulos de las celdas del cartón visible. */
export async function readCardTitles(page: Page): Promise<string[]> {
  await expect(page.getByRole('grid', { name: 'Cartón de bingo' })).toBeVisible();
  return page.getByRole('gridcell').allInnerTexts();
}
