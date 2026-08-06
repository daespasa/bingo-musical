import { expect, test, type Page } from '@playwright/test';
import { createGameAndOpenRoom, enableAudio, joinAsPlayer, loginAsHost } from './helpers';

/**
 * Sonda de partida real. No afirma casi nada: juega una partida completa
 * ejercitando todos los controles del anfitrión y recoge lo que se rompe por
 * el camino (errores de consola, peticiones fallidas, estados incoherentes).
 *
 * No forma parte de la suite: se ejecuta a mano con
 * `pnpm exec playwright test e2e/real-game.probe.spec.ts`.
 */

type Finding = { where: string; what: string };
const findings: Finding[] = [];

function watch(page: Page, where: string): void {
  page.on('console', (msg) => {
    if (msg.type() === 'error') findings.push({ where, what: `consola: ${msg.text()}` });
  });
  page.on('pageerror', (err) => findings.push({ where, what: `excepción: ${err.message}` }));
  page.on('response', (res) => {
    if (res.status() >= 400 && !res.url().includes('favicon')) {
      findings.push({ where, what: `${res.status()} en ${res.url()}` });
    }
  });
}

test('sonda de partida real', async ({ browser, page }) => {
  test.setTimeout(300_000);
  watch(page, 'anfitrión');

  await loginAsHost(page);
  const code = await createGameAndOpenRoom(page, { name: 'Sonda', snippetSeconds: '10' });

  const players = [];
  for (const alias of ['Marta', 'Leo', 'Ana']) {
    const p = await joinAsPlayer(browser, code, alias);
    watch(p.page, alias);
    await enableAudio(p.page);
    players.push({ alias, ...p });
  }

  // El anfitrión ve a los tres
  await expect(page.getByRole('heading', { name: /Jugadores \(3\)/ })).toBeVisible();

  await page.getByRole('button', { name: 'Empezar partida' }).click();

  // `.first()` evita el modo estricto cuando el nombre casa con varios
  // botones (un «Expulsar» por jugador), que no es un fallo del producto.
  const control = async (name: string | RegExp) => {
    const button = page.getByRole('button', { name }).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      await page.waitForTimeout(1500);
    } else {
      findings.push({ where: 'anfitrión', what: `no encuentro el control ${String(name)}` });
    }
  };

  // Ronda 1: marcar en los tres a la vez y comprobar que el servidor responde
  await players[0]!.page.getByText(/Suena la canción|Escucha…/).waitFor({ timeout: 30_000 });
  await Promise.all(
    players.map(async (p) => {
      const cell = p.page.getByRole('gridcell').nth(1);
      await cell.click();
      await expect(cell)
        .toHaveAttribute('aria-label', /\((fallada|acertada)\)/, { timeout: 10_000 })
        .catch(() => findings.push({ where: p.alias, what: 'un toque se quedó sin veredicto' }));
    }),
  );

  // Controles del anfitrión
  await control('Pausar');
  for (const p of players) {
    await expect(p.page.getByText('Partida en pausa'))
      .toBeVisible({ timeout: 10_000 })
      .catch(() => findings.push({ where: p.alias, what: 'no vi la pausa' }));
  }
  await control('Reanudar');
  await control('Repetir fragmento');
  await control(/\+10 s/);
  await control('Revelar');
  await control('Siguiente canción');
  await control('Omitir canción');

  // Recarga en mitad de la partida
  await players[1]!.page.reload();
  await expect(players[1]!.page.getByRole('grid', { name: 'Cartón de bingo' }))
    .toBeVisible({ timeout: 20_000 })
    .catch(() => findings.push({ where: 'Leo', what: 'el cartón no vuelve tras recargar' }));

  // Reclamación falsa
  await players[2]!.page.getByRole('button', { name: /¡Línea!/ }).click();
  await players[2]!.page.waitForTimeout(1500);

  // Expulsar y bloquear
  await control('Expulsar');
  await control(/^Bloquear sala$|^Desbloquear sala$/);

  await control('Finalizar');
  await control('Terminar y ver resultados');
  for (const p of players) {
    await expect(p.page.getByText('¡Fin de la partida!'))
      .toBeVisible({ timeout: 30_000 })
      .catch(() => findings.push({ where: p.alias, what: 'no llegó el fin de partida' }));
  }

  for (const p of players) await p.context.close();

   
  console.log(
    '\n=== HALLAZGOS ===\n' + (findings.length ? JSON.stringify(findings, null, 2) : 'ninguno'),
  );
});
