# Copy de la portada — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-08-11-copy-de-la-landing-design.md` (vive en la
rama `fix/config-por-modo`; esta rama sale de `main`, así que el spec no está en el
árbol de trabajo — todo lo que hace falta de él está copiado aquí).

**Goal:** Que la portada diga en un vistazo qué es Gramola, qué hace falta para
empezar y qué se juega, en lugar de describir el antitrampas del bingo.

**Architecture:** Solo texto. Se reescriben el párrafo del rótulo y los tres créditos
de `apps/web/src/app/page.tsx`, manteniendo estructura, retícula, ilustración y
botones. No hay componentes nuevos, ni secciones nuevas, ni CSS nuevo.

**Tech Stack:** Next.js 15 (App Router), Tailwind, Playwright para la comprobación
responsive.

## Global Constraints

- Ámbito: **un solo archivo de producto**, `apps/web/src/app/page.tsx`. Nada de
  `apps/api`, `packages/*`, ni migraciones.
- No se añaden secciones, tarjetas de modo, iconos ni clases nuevas. La portada sigue
  siendo de una sola pantalla.
- El rótulo «Tu música. Vuestro juego.», los botones «Crear partida» / «Entrar con
  código», el enlace «Acceder» y la ilustración del disco **no se tocan**.
- No se toca `APP_BRAND` ni el nombre del producto.
- «Bingo» solo puede aparecer como **modo de juego**, nunca como nombre de producto:
  el test `packages/shared/src/brand.test.ts:57` prohíbe la cadena «Bingo Musical» en
  el código de las apps y debe seguir en verde.
- Textos exactos (copiados del spec, sin reescribirlos):
  - Párrafo: «Pon la música, comparte un código de seis letras y que cada móvil sea un
    mando. Sin instalar nada y sin cuenta para quien juega.»
  - Crédito 1 — etiqueta «Tu música»: «Empieza con la colección de muestra o importa
    cualquier lista pública de Spotify.»
  - Crédito 2 — etiqueta «Su móvil»: «Entran con el código o el QR. Nada que instalar,
    ninguna cuenta que crear.»
  - Crédito 3 — etiqueta «Vuestro juego»: «Bingo, quiz, adivina la canción,
    supervivencia o una mezcla de todo.»
- Los tres créditos deben seguir cabiendo en una fila a partir de `sm` sin desbordar,
  y la portada no debe hacer scroll horizontal a 360 px.
- Comentarios, documentación y mensajes de commit en español (`CLAUDE.md`).
- Cualquier decisión visual pasa por la skill `gramola-design-taste`; `DESIGN.md`
  manda sobre preferencias genéricas.

## Estado actual verificado (no hace falta volver a investigarlo)

- `apps/web/src/app/page.tsx:19-31` define la constante `CREDITS`, un array de tres
  objetos `{ label, text }`. Las etiquetas actuales son «Jugadores», «Música» y
  «Reglas».
- `apps/web/src/app/page.tsx:62-65` es el párrafo del rótulo: «Crea una sala y juega
  con amigos mediante bingo, preguntas y desafíos musicales. Cada móvil es un mando:
  sin instalar nada y sin cuenta para quien juega.»
- La tira de créditos se pinta en un `<dl>` con
  `mt-12 grid gap-5 border-t-2 … sm:grid-cols-3` (línea 78), con `<dt>` para la
  etiqueta y `<dd>` para el texto. La estructura no cambia: solo el contenido de
  `CREDITS`.
- `apps/web` en esta rama **no tiene runner de tests unitarios** (eso llega en otra
  rama, la del spec 2). La verificación aquí es: test de marca en `@bingo/shared`,
  `lint`, `build` y una comprobación responsive con Playwright.
- Playwright: un solo proyecto `chromium`, `testDir: './e2e'`,
  `baseURL: http://localhost:3000`. Las sondas (`*.probe.spec.ts`) quedan fuera del
  recorrido normal salvo con `PW_PROBE=1`.

## Estructura de archivos

| Archivo                                   | Responsabilidad                                     |
| ----------------------------------------- | --------------------------------------------------- |
| `apps/web/src/app/page.tsx` (modificar)   | Nuevo párrafo del rótulo y nuevos tres créditos.    |
| `e2e/portada.spec.ts` (nuevo)             | La portada dice lo que debe y no desborda a 360 px. |
| `CHANGELOG.md`, `PROGRESS.md` (modificar) | Registro del cambio.                                |

---

### Task 1: Reescribir el párrafo y los tres créditos

**Files:**

- Modify: `apps/web/src/app/page.tsx:19-31` (constante `CREDITS`) y `:62-65` (párrafo)

**Interfaces:**

- Consumes: nada nuevo.
- Produces: la constante `CREDITS` mantiene su forma `Array<{ label: string; text: string }>`
  y su orden de uso en el `<dl>`; solo cambia el contenido.

- [ ] **Step 1: Sustituir la constante `CREDITS`**

Deja el bloque exactamente así (los textos son los del spec, no los reescribas):

```tsx
/*
 * Los tres pasos de montar una partida, en el orden en que ocurren. Las
 * etiquetas recogen el rótulo para que la tira se lea como su desarrollo y no
 * como tres datos sueltos.
 */
const CREDITS = [
  {
    label: 'Tu música',
    text: 'Empieza con la colección de muestra o importa cualquier lista pública de Spotify.',
  },
  {
    label: 'Su móvil',
    text: 'Entran con el código o el QR. Nada que instalar, ninguna cuenta que crear.',
  },
  {
    label: 'Vuestro juego',
    text: 'Bingo, quiz, adivina la canción, supervivencia o una mezcla de todo.',
  },
];
```

- [ ] **Step 2: Sustituir el párrafo del rótulo**

Cambia el contenido del `<p className="mt-6 max-w-md …">` (líneas 62-65), sin tocar
sus clases:

```tsx
<p className="mt-6 max-w-md text-pretty text-lg leading-8 text-slate-600 dark:text-slate-300">
  Pon la música, comparte un código de seis letras y que cada móvil sea un mando. Sin instalar nada
  y sin cuenta para quien juega.
</p>
```

- [ ] **Step 3: Comprobar que no queda nada del texto viejo**

Run: `rg -n "Jugadores|Reglas|colar una marca|Crea una sala y juega" apps/web/src/app/page.tsx`
Expected: sin resultados.

- [ ] **Step 4: Validar estilo, marca y build**

Run: `pnpm --filter @bingo/web lint && pnpm --filter @bingo/shared test && pnpm --filter @bingo/web build`
Expected: sin errores; en particular, el test «no queda «Bingo Musical» en el código
de las apps» sigue en verde (el nuevo crédito dice «Bingo» a secas, como modo de
juego, que es uso legítimo).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/page.tsx
git commit -m "feat(web): la portada cuenta qué es Gramola y qué se juega"
```

---

### Task 2: Comprobación responsive y de contenido

**Files:**

- Create: `e2e/portada.spec.ts`

**Interfaces:**

- Consumes: nada de `e2e/helpers.ts` — la portada es pública y no necesita sesión.
- Produces: nada que consuman otras tareas.

- [ ] **Step 1: Escribir la prueba**

Crea `e2e/portada.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test.describe('Portada', () => {
  test('cuenta qué es, qué hace falta y qué se juega', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Tu música');
    await expect(page.getByText(/comparte un código de seis letras/)).toBeVisible();

    // Los tres créditos son los tres pasos de montar una partida.
    for (const etiqueta of ['Tu música', 'Su móvil', 'Vuestro juego']) {
      await expect(page.getByText(etiqueta, { exact: true })).toBeVisible();
    }
    await expect(page.getByText(/Bingo, quiz, adivina la canción/)).toBeVisible();

    // Lo que el spec deja intacto sigue ahí.
    await expect(page.getByRole('link', { name: 'Crear partida' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Entrar con código' })).toBeVisible();
  });

  test('a 360 px no desborda y los créditos siguen legibles', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/');

    // Nada de scroll horizontal: el ancho del documento no supera el de la ventana.
    const desborda = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(desborda).toBe(false);

    await expect(page.getByText(/Bingo, quiz, adivina la canción/)).toBeVisible();
  });
});
```

- [ ] **Step 2: Levantar el entorno y ejecutar la prueba**

Run:

```bash
docker compose up -d
pnpm exec playwright test e2e/portada.spec.ts
```

Expected: 2 passed. (`docker compose down -v` está prohibido: borra los datos
locales.)

- [ ] **Step 3: Mirar la portada de verdad, a 360 px y en escritorio**

El spec pide comprobación visual, no solo aserciones. Haz capturas en los dos
tamaños y míralas:

```bash
pnpm exec playwright screenshot --viewport-size=360,780 http://localhost:3000 /tmp/portada-360.png
pnpm exec playwright screenshot --viewport-size=1440,900 http://localhost:3000 /tmp/portada-escritorio.png
```

Comprueba: los tres créditos en una sola fila a partir de `sm`, sin que el tercero
—el más largo— descuadre la retícula ni empuje la ilustración. Si a 360 px descuadra,
el spec autoriza **una sola** alternativa para ese tercer texto: «Bingo, quiz,
adivinanzas, supervivencia o una mezcla». No inventes otra reescritura, y si la usas,
actualiza también la prueba de Playwright que cita ese texto.

Las capturas son temporales: no las commitees.

- [ ] **Step 4: Commit**

```bash
git add e2e/portada.spec.ts
git commit -m "test(e2e): la portada dice lo que debe y aguanta 360 px"
```

---

### Task 3: Documentación

**Files:**

- Modify: `CHANGELOG.md` (sección `## [Unreleased]` → `### Changed`; créala encima de
  `## [0.6.0] - 2026-08-11` si no existe)
- Modify: `PROGRESS.md`

- [ ] **Step 1: Revisar el propio diff**

Run: `git diff main --stat && git diff main`
Comprueba que solo cambian `apps/web/src/app/page.tsx`, `e2e/portada.spec.ts` y los
dos archivos de documentación, y que el rótulo, los botones y la ilustración están
intactos.

- [ ] **Step 2: Escribir las entradas**

En `CHANGELOG.md`, bajo `## [Unreleased]` → `### Changed`:

```markdown
- La portada cuenta qué es Gramola, qué hace falta para empezar y qué se juega, en
  vez de describir cómo se validan las jugadas del bingo. Los tres créditos pasan a
  ser los tres pasos de montar una partida.
```

En `PROGRESS.md`, anota el spec 4 del pulido posterior a v0.6.0 («Copy de la
portada») como hecho, con el formato de las entradas vecinas.

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md PROGRESS.md
git commit -m "docs: registra el nuevo copy de la portada"
```

---

## Fuera de alcance (del spec, explícito)

- Añadir una sección con las cinco tarjetas de modo bajo el rótulo: descartado, para
  no duplicar el selector que ya existe dentro del producto ni romper la portada de
  una sola pantalla.
- Cualquier cambio en la ilustración del disco, la retícula o el `APP_BRAND`.
