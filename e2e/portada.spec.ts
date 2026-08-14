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
    // El disco que gira («.vinyl.animate-spin-record») es un <div> cuadrado
    // con `border-radius` para parecer circular: el radio recorta el pintado
    // pero no la caja de layout, así que al rotar por un ángulo intermedio
    // (p. ej. 45°) su caja alineada a los ejes crece más allá del círculo
    // visible y empuja `scrollWidth` por unos milisegundos, de forma cíclica,
    // mientras la animación siga viva. No es un artefacto del arranque en
    // frío de `next dev`: se reproduce igual con el servidor ya caliente,
    // así que esperar a `networkidle` no lo evita. `prefers-reduced-motion`
    // congela la animación (ver `globals.css`), así que la usamos para medir
    // un layout estable. No la quites: sin ella la prueba es intermitente
    // porque puede muestrear justo el instante en que el disco gira en diagonal.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);

    // Nada de scroll horizontal: el ancho del documento no supera el de la
    // ventana. Se sondea con reintentos acotados por si el layout tarda un
    // instante más en asentarse tras cargar.
    await expect
      .poll(
        () =>
          page.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          ),
        { timeout: 5_000 },
      )
      .toBe(false);

    await expect(page.getByText(/Bingo, quiz, adivina la canción/)).toBeVisible();
  });
});
