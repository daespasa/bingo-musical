import { expect, test } from '@playwright/test';
import { createGameAndOpenRoom, enableAudio, joinAsPlayer, loginAsHost } from './helpers';

test.describe('Salida de partida', () => {
  test('el anfitrión vuelve a sus partidas y el invitado a la portada', async ({
    browser,
    page,
  }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, { name: 'E2E salida de partida' });
    const marta = await joinAsPlayer(browser, code, 'Marta');
    await enableAudio(marta.page);

    await page.getByRole('button', { name: 'Empezar partida' }).click();
    await page.getByRole('button', { name: 'Finalizar' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('button', { name: 'Terminar y ver resultados' }).click();

    // El podio tarda en revelarse (la ceremonia va por pasos): los botones del
    // final aparecen cuando termina.
    await expect(page.getByText('¡Fin de la partida!')).toBeVisible();
    await expect(marta.page.getByText('¡Fin de la partida!')).toBeVisible();

    // Invitada: sale a la portada, donde puede entrar a otra sala con un código.
    const salir = marta.page.getByRole('link', { name: 'Salir' });
    await expect(salir).toBeVisible({ timeout: 20_000 });
    await salir.click();
    await expect(marta.page).toHaveURL('/');
    await expect(marta.page.getByRole('link', { name: /Entrar con código/ })).toBeVisible();

    // Anfitrión: vuelve al panel, y la sesión sigue viva (el menú de usuario
    // sigue ahí), que es justo lo que el botón anterior daba a entender que no.
    const volver = page.getByRole('link', { name: 'Volver a mis partidas' });
    await expect(volver).toBeVisible({ timeout: 20_000 });
    await volver.click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('link', { name: 'Tu cuenta' })).toBeVisible();

    await marta.context.close();
  });

  test('desde el resumen de la partida, el anfitrión también vuelve al panel', async ({ page }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, { name: 'E2E salida desde resumen' });

    // El resumen de una sala sin resultados enseña el mismo control de salida.
    await page.goto(`/room/${code}/results`);
    const volver = page.getByRole('link', { name: 'Volver a mis partidas' });
    await expect(volver).toBeVisible();
    await volver.click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
