import type { Browser, BrowserContext, Cookie, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * La tarjeta de la colección demo en el asistente de partida. Se descartan a
 * propósito las copias («Colección Demo (copia)»), que aparecen en cuanto
 * alguien duplica la colección y harían ambiguo el selector.
 */
export function demoCollectionCard(page: Page) {
  return page
    .getByRole('button')
    .filter({ hasText: 'Colección Demo' })
    .filter({ hasNotText: 'copia' })
    .first();
}

export const DEMO_USER = { email: 'demo@bingo.local', password: 'Demo1234!' };

/**
 * Cookies de una sesión ya iniciada, compartidas entre pruebas.
 *
 * El acceso está limitado a diez intentos por minuto, que es una protección
 * que debe seguir ahí. Entrar por el formulario en cada prueba agota esa cuota
 * y las últimas del recorrido se quedan fuera, así que se entra una vez y se
 * reutiliza la sesión. Si deja de valer (por ejemplo tras cerrar sesión en los
 * demás dispositivos), se vuelve a entrar.
 */
let sesionCompartida: Cookie[] | null = null;

async function entrarPorFormulario(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Correo').fill(DEMO_USER.email);
  await page.getByLabel('Contraseña').fill(DEMO_USER.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  sesionCompartida = await page.context().cookies();
}

/**
 * Deja la página en el panel, con la sesión del anfitrión demo.
 *
 * @param opciones.fresh  Fuerza entrar por el formulario para conseguir una
 *   sesión propia. Lo necesitan las pruebas que comparan dos sesiones, como
 *   cerrar sesión en los demás dispositivos.
 */
export async function loginAsHost(page: Page, opciones: { fresh?: boolean } = {}): Promise<void> {
  if (opciones.fresh) {
    await entrarPorFormulario(page);
    return;
  }
  if (sesionCompartida) {
    await page.context().addCookies(sesionCompartida);
    await page.goto('/dashboard');

    /*
     * Comprobar la URL no basta, y comprobar que existe el enlace «Tu cuenta»
     * tampoco: la cookie puede seguir presente pero estar revocada en el
     * servidor —tras un cierre de sesión o al cerrar las demás sesiones— y el
     * middleware solo mira que exista. La página empieza a renderizarse en
     * /dashboard y solo se va a /login cuando el cliente resuelve la sesión.
     *
     * Así que se espera a un dato que únicamente llega con sesión válida: el
     * nombre de la cuenta. Sin esto, el helper daba por buena una sesión
     * muerta y la prueba fallaba más tarde, en una navegación cualquiera.
     */
    const sigueValida = await page
      .getByRole('link', { name: 'Tu cuenta' })
      .filter({ hasText: 'Anfitrión Demo' })
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(
        () => true,
        () => false,
      );
    if (sigueValida) return;

    sesionCompartida = null;
    await page.context().clearCookies();
  }
  await entrarPorFormulario(page);
}

/**
 * Olvida la sesión compartida.
 *
 * La llaman las pruebas que la invalidan a propósito (cerrar sesión, cerrar
 * las demás sesiones). Sin esto, la siguiente prueba pagaría la comprobación
 * de arriba en balde antes de volver a entrar.
 */
export function olvidarSesionCompartida(): void {
  sesionCompartida = null;
}

/**
 * Crea una partida con la colección demo y ajustes rápidos, abre la sala en
 * modo remoto y devuelve su código.
 */
export async function createGameAndOpenRoom(
  page: Page,
  options: {
    name: string;
    snippetSeconds?: '10' | '15';
    autoReveal?: boolean;
    /** Variante del bingo. Por defecto, a ciegas: el bingo de siempre. */
    variant?: 'Bingo a ciegas' | 'Bingo clásico';
    /** Modo de juego. Por defecto, bingo musical. */
    mode?: 'Bingo musical' | 'Quiz musical' | 'Adivina la canción' | 'Supervivencia' | 'Modo mixto';
    /** Vidas iniciales en Supervivencia. */
    lives?: 1 | 2 | 3 | 5;
    /** Tamaño del cartón de bingo. Por defecto, 3×3. */
    cardSize?: 3 | 4 | 5;
  } = {
    name: 'E2E',
  },
): Promise<string> {
  await page.goto('/dashboard/games/new');
  if (options.mode && options.mode !== 'Bingo musical') {
    await page.getByRole('radio', { name: new RegExp(options.mode) }).click();
  }
  if (options.variant) {
    await page.getByRole('radio', { name: new RegExp(options.variant) }).click();
  }
  if (options.lives) {
    await page
      .getByRole('group', { name: 'Vidas por jugador' })
      .getByRole('radio', { name: String(options.lives), exact: true })
      .click();
  }
  await page.getByLabel('Nombre de la partida').fill(options.name);
  await demoCollectionCard(page).click();
  if (options.cardSize) {
    await page.getByRole('button', { name: `${options.cardSize} × ${options.cardSize}` }).click();
  }
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
