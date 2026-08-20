# Portadas en el cartón de bingo — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-08-11-portadas-en-el-carton-design.md` (vive en la
rama `fix/config-por-modo`; todo lo necesario está copiado aquí).

**Goal:** Aprovechar las portadas que ya están guardadas: una opción del bingo, apagada
por defecto, que pinta la carátula del álbum en cada casilla —desenfocada hasta que la
canción se revela, nítida después—.

**Architecture:** `showArtwork` entra en `musicBingoConfig` (es del bingo, no común). La
portada llega a la vista del cartón por unión desde la celda a su pista y su álbum, sin
migración. El wizard solo deja activarla si la colección tiene carátulas suficientes, y la
colección de muestra estrena carátulas generadas por nosotros, no comerciales.

**Tech Stack:** Zod en `@bingo/shared`, NestJS + Prisma en `apps/api`, seed en
`packages/database`, Next.js `next/image` en `apps/web`, Vitest y Playwright.

## Global Constraints

- **Solo en el bingo.** En un quiz de título la portada delataría la respuesta: la opción
  vive en `musicBingoConfig` y no se ofrece en ningún otro modo.
- **Apagada por defecto** (`showArtwork: z.boolean().default(false)`).
- **El texto no desaparece nunca.** La portada es un añadido: el cartón tiene que seguir
  siendo jugable con la imagen sin cargar, y el título queda legible sobre ella (velo).
- **El desenfoque es recompensa visual, no ocultación**: en el bingo cada jugador ya ve
  los títulos de sus casillas. Se resuelve entero en CSS, sin proxy de imágenes.
- Una URL rota debe degradar a la casilla de solo texto, **nunca** a un hueco roto.
- Con `prefers-reduced-motion`, el paso a nítido es instantáneo, sin transición.
- Umbral de cobertura: la colección necesita portada en **al menos el 80 %** de sus
  pistas; por debajo, la opción se ofrece deshabilitada con el motivo escrito.
- **No se descargan portadas comerciales al repositorio**: las de la demo se generan.
- Sin cambios en el motor: ni la generación de cartones ni el marcado.
- El cambio del contrato del cartón es **aditivo**: una celda sin portada se pinta como
  hoy.
- Peso: pedir el tamaño pequeño de la CDN y medir el cartón 5×5 antes de dar esto por
  bueno (25 imágenes en móviles ajenos y redes de salón).
- `@bingo/shared` se consume desde `dist`. Turborepo con entorno estricto: variable nueva,
  variable declarada en `turbo.json`.
- Comentarios, documentación y mensajes de commit en español. `gramola-design-taste` y
  `DESIGN.md` mandan sobre lo visual, y las carátulas de la demo son trabajo de diseño.
- Nunca `docker compose down -v`.

## Estado actual verificado (no hace falta volver a investigarlo)

- `Album.coverUrl` existe (`schema.prisma:212`) y el importador de Spotify lo rellena. Hoy
  **no lo consume nadie**.
- `BingoCardCell` (`schema.prisma:464-480`) tiene `trackId` y relación `track`, y `Track`
  (`:216-236`) tiene `albumId` y relación `album`. Es decir, **la portada se alcanza por
  unión desde la celda: no hace falta migración**.
- `apps/api/src/realtime/cards.service.ts`: `getForParticipant` (línea 47) consulta
  `bingoCard` con `include: { cells: { orderBy: { position: 'asc' } } }` y `toView`
  (línea 56) construye la `CardView` celda a celda.
- `packages/shared/src/contracts.ts:25-35`: `CellView` tiene `displayTitle`,
  `displayArtist`, `isFree` y `status`; `CardView` tiene `id`, `size` y `cells`.
- `apps/web/src/components/bingo-card.tsx`: pinta cada celda como un `<button role="gridcell">`
  con `aspect-square`, `overflow-hidden` y el título centrado; ya usa `clsx` y estados de
  marcada/fallada/libre.
- `packages/database/prisma/seed.ts` es el seed de la colección de muestra; los scripts de
  generación de recursos de la demo viven en `scripts/` (`generate-icons.mjs`,
  `generate-demo-audio.mjs`) y se invocan desde `package.json` (`demo:icons`,
  `demo:audio`, `demo:assets`).
- `apps/web` tiene Vitest; `packages/shared` y `apps/api` también.

## Estructura de archivos

| Archivo                                                     | Responsabilidad                                      |
| ----------------------------------------------------------- | ---------------------------------------------------- |
| `packages/shared/src/game-config.ts` (modificar)            | `showArtwork` en la configuración del bingo.         |
| `packages/shared/src/artwork.ts` (nuevo)                    | Umbral de cobertura de carátulas.                    |
| `packages/shared/src/artwork.test.ts` (nuevo)               | 80 % justo, por debajo, colección vacía.             |
| `packages/shared/src/contracts.ts` (modificar)              | `coverUrl` en la celda del cartón.                   |
| `apps/api/src/realtime/cards.service.ts` (modificar)        | La portada llega por unión.                          |
| `apps/api/src/collections/*` (modificar)                    | Cobertura de carátulas en el listado de colecciones. |
| `scripts/generate-demo-covers.mjs` (nuevo)                  | Carátulas propias de la demo.                        |
| `apps/web/public/covers/*` (nuevo)                          | Las carátulas generadas.                             |
| `packages/database/prisma/seed.ts` (modificar)              | El seed las asigna.                                  |
| `apps/web/src/components/bingo-card.tsx` (modificar)        | La casilla con portada.                              |
| `apps/web/src/app/dashboard/games/new/page.tsx` (modificar) | La opción en el wizard, con su umbral.               |
| `apps/web/next.config.mjs` (modificar)                      | `remotePatterns` de la CDN de Spotify.               |
| `e2e/portadas.spec.ts` (nuevo)                              | Con y sin la opción.                                 |

---

### Task 1: Configuración, umbral y contrato

**Files:**

- Modify: `packages/shared/src/game-config.ts` (`musicBingoConfigSchema`)
- Create: `packages/shared/src/artwork.ts`
- Test: `packages/shared/src/artwork.test.ts`
- Modify: `packages/shared/src/contracts.ts:25-29` (`CellView`)
- Modify: `packages/shared/src/index.ts`

**Interfaces:**

- Produces:

  ```ts
  // game-config.ts, dentro de musicBingoConfigSchema
  showArtwork: z.boolean().default(false),

  // artwork.ts
  export const ARTWORK_COVERAGE_THRESHOLD = 0.8;
  /** Si una colección tiene carátulas suficientes para que el cartón con portadas valga la pena. */
  export function hasEnoughArtwork(withCover: number, total: number): boolean;

  // contracts.ts, en CellView
  /** Carátula del álbum. Nula cuando no hay, y entonces la casilla se pinta como siempre. */
  coverUrl: string | null;
  ```

- [x] **Step 1: Escribir la prueba que falla**

`packages/shared/src/artwork.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { hasEnoughArtwork } from './artwork';

describe('hasEnoughArtwork', () => {
  it('el 80 % justo vale', () => {
    expect(hasEnoughArtwork(8, 10)).toBe(true);
  });

  it('por debajo del 80 % no', () => {
    expect(hasEnoughArtwork(7, 10)).toBe(false);
  });

  it('todas con carátula, obviamente sí', () => {
    expect(hasEnoughArtwork(10, 10)).toBe(true);
  });

  /*
   * Una colección vacía no «cumple» el umbral: activar portadas sobre nada
   * daría un cartón de huecos. Y dividir por cero no es una respuesta.
   */
  it('una colección vacía no vale', () => {
    expect(hasEnoughArtwork(0, 0)).toBe(false);
  });

  it('ninguna carátula tampoco', () => {
    expect(hasEnoughArtwork(0, 25)).toBe(false);
  });
});
```

- [x] **Step 2: Verla fallar**

Run: `pnpm --filter @bingo/shared test`

- [x] **Step 3: Implementar**

- `artwork.ts` con el umbral y la función, comentando por qué 80 % (por debajo, un cartón
  medio vacío queda peor que uno de solo texto) y por qué la colección vacía no cumple.
- `showArtwork` en `musicBingoConfigSchema`, con el comentario del spec: «Las casillas
  muestran la carátula del álbum, nítida al revelar.»
- `coverUrl: string | null` en `CellView`, con su comentario.
- Reexporta `artwork` desde `index.ts`.

- [x] **Step 4: Verla pasar y construir**

Run: `pnpm --filter @bingo/shared test && pnpm --filter @bingo/shared build`
Expected: PASS. Comprueba que los tests que ya existen de `game-config` siguen en verde:
`showArtwork` tiene `default`, así que las configuraciones guardadas sin ese campo deben
seguir leyéndose.

- [x] **Step 5: Commit**

```bash
git add packages/shared/src
git commit -m "feat(shared): opción de portadas en el cartón y umbral de cobertura"
```

---

### Task 2: La portada llega a la vista del cartón, y la cobertura al listado

**Files:**

- Modify: `apps/api/src/realtime/cards.service.ts` (`getForParticipant` y `toView`)
- Modify: `apps/api/src/collections/collections.service.ts` (y su DTO, donde esté)

**Interfaces:**

- Consumes: `CellView.coverUrl` y `hasEnoughArtwork` (Tarea 1).
- Produces: cada colección del listado expone si tiene carátulas suficientes. Elige el
  nombre mirando cómo están nombrados los campos vecinos del DTO (`trackCount`,
  `isDemo`, …) y déjalo escrito en el informe, porque la Tarea 5 lo consume.

- [x] **Step 1: La portada en el cartón**

En `getForParticipant`, amplía el `include` para traer el álbum de la pista de cada celda,
pidiendo **solo** lo que hace falta:

```ts
      include: {
        cells: {
          orderBy: { position: 'asc' },
          include: { track: { select: { album: { select: { coverUrl: true } } } } },
        },
      },
    });
```

Y en `toView`, `coverUrl: c.track?.album?.coverUrl ?? null`. Ojo: `toView` también se llama
desde otros sitios con cartones que quizá no traigan la unión; ajusta la firma para que el
tipo lo refleje (nada de `as any`) y revisa a sus llamantes. Un comentario en español
explicando que la portada se resuelve por unión y no se persiste en la celda, porque la
celda ya guarda el `trackId` y duplicarla obligaría a migrar.

- [x] **Step 2: La cobertura en el listado de colecciones**

El wizard necesita saber, por colección, si tiene carátulas suficientes. Cuéntalo en la
consulta que ya lista colecciones (cuántas de sus pistas tienen álbum con `coverUrl` no
nulo) y expón el booleano usando `hasEnoughArtwork`. **No** devuelvas la lista de URLs: el
wizard solo necesita el sí o el no.

- [x] **Step 3: Comprobar**

Run: `pnpm --filter @bingo/shared build && pnpm --filter @bingo/api typecheck && pnpm --filter @bingo/api test`

- [x] **Step 4: Commit**

```bash
git add apps/api/src
git commit -m "feat(api): la casilla del cartón lleva su carátula y la colección dice si tiene"
```

---

### Task 3: Carátulas propias para la colección de muestra

**Files:**

- Create: `scripts/generate-demo-covers.mjs`
- Create: `apps/web/public/covers/*` (generadas)
- Modify: `packages/database/prisma/seed.ts`
- Modify: `package.json` (script `demo:covers`, y súmalo a `demo:assets`)

**Interfaces:**

- Produces: rutas locales estables (`/covers/<slug>.svg` o `.png`) que el seed escribe en
  `Album.coverUrl` de la colección de muestra.

- [x] **Step 1: Mirar cómo se generan los otros recursos de la demo**

Lee `scripts/generate-icons.mjs` y sigue su estilo: mismo tipo de script, mismas
dependencias (ninguna nueva), misma forma de escribir en `apps/web/public`.

- [x] **Step 2: Diseñar la carátula**

Bloques de color derivados del título, en la paleta de la marca. **Esto es diseño, no solo
código**: aplica `gramola-design-taste` con `DESIGN.md` delante. Requisitos:

- Determinista: el mismo título da siempre la misma carátula.
- Cuadrada, legible en 96 px (el tamaño real de una casilla de cartón 5×5 en móvil).
- Sin texto dentro: el título ya va encima, en la casilla.
- Ligera: son 25 por cartón.

- [x] **Step 3: Generarlas y asignarlas en el seed**

Genera las carátulas de las pistas de la colección de muestra y haz que el seed rellene
`Album.coverUrl` con su ruta local. El seed debe seguir siendo idempotente: ejecutarlo dos
veces no puede duplicar álbumes ni dejar rutas colgando.

- [x] **Step 4: Comprobar**

Run:

```bash
docker compose up -d
node scripts/generate-demo-covers.mjs
pnpm db:seed
```

Y comprueba en la base de datos que la colección de muestra pasa del umbral del 80 %.
**Mira** un par de carátulas generadas con la herramienta de lectura de imágenes y cuenta
en el informe si tienen el aspecto de la marca o parecen ruido de colores.

- [x] **Step 5: Commit**

```bash
git add scripts/generate-demo-covers.mjs apps/web/public/covers packages/database/prisma/seed.ts package.json
git commit -m "feat(demo): carátulas propias para la colección de muestra"
```

---

### Task 4: La casilla con portada

**Files:**

- Modify: `apps/web/src/components/bingo-card.tsx`
- Modify: `apps/web/next.config.mjs`
- Test: `apps/web/src/components/bingo-card.test.tsx` (nuevo)

**Interfaces:**

- Consumes: `CellView.coverUrl` (Tarea 1) y la configuración `showArtwork`, que llega a la
  pantalla de juego con el resto del estado de sala. Antes de asumir por dónde llega,
  compruébalo: si la vista de jugador no recibe hoy `showArtwork`, dilo en el informe y
  propón la vía mínima (llevarlo en el estado de sala, como el resto de ajustes visibles).

- [x] **Step 1: Escribir la prueba que falla**

`bingo-card.test.tsx` con Testing Library: (a) con `coverUrl` y portadas activadas, la
casilla pinta una imagen y **sigue mostrando el título**; (b) sin `coverUrl`, no hay
imagen y el marcado es el de hoy; (c) sin revelar, la imagen lleva la clase de desenfoque;
revelada, no la lleva. Usa los estados de celda que ya existen (`status`).

- [x] **Step 2: Verla fallar**

Run: `pnpm --filter @bingo/web test`

- [x] **Step 3: Implementar**

- Imagen con `next/image` ocupando la casilla, título encima con velo suficiente para que
  se lea (compruébalo con contraste, no a ojo).
- Sin revelar: `blur` medio y saturación baja. Al revelar: transición corta a nítido. Con
  `prefers-reduced-motion`, instantáneo (usa la variante `motion-reduce:` de Tailwind).
- **Degradación**: si la imagen falla al cargar, la casilla vuelve a ser de solo texto (el
  `onError` de la imagen basta; nada de huecos rotos).
- Pide el tamaño pequeño: `sizes` acorde a una casilla, no la imagen a tamaño completo.
- En `next.config.mjs`, declara el dominio de la CDN de Spotify en `remotePatterns`.

- [x] **Step 4: Comprobar**

Run: `pnpm --filter @bingo/web test && pnpm --filter @bingo/web typecheck && pnpm --filter @bingo/web lint && pnpm --filter @bingo/web build`

- [x] **Step 5: Commit**

```bash
git add apps/web/src apps/web/next.config.mjs
git commit -m "feat(web): la casilla del cartón puede enseñar la carátula del álbum"
```

---

### Task 5: La opción en el wizard

**Files:**

- Modify: `apps/web/src/app/dashboard/games/new/page.tsx`

**Interfaces:**

- Consumes: el booleano de cobertura del listado de colecciones (Tarea 2) y `showArtwork`
  (Tarea 1).

- [x] **Step 1: Añadir la casilla**

Dentro de la sección del bingo, junto al selector de variante (la sección ya está
condicionada a `esBingo`): «Casillas con portada», apagada por defecto.

- [x] **Step 2: Deshabilitarla cuando no proceda**

Si la colección elegida no tiene carátulas suficientes, la casilla se ofrece
**deshabilitada con el motivo escrito** («esta colección no tiene carátulas»), no oculta:
que se vea que la opción existe. Si el anfitrión cambia de colección, el estado se
recalcula.

- [x] **Step 3: Enviarla**

`showArtwork` viaja dentro de `modeConfig` del bingo, junto a `revealMode`. Fuera del
bingo no se manda (el envío ya distingue por modo).

- [x] **Step 4: Comprobar**

Run: `pnpm --filter @bingo/web test && pnpm --filter @bingo/web typecheck && pnpm --filter @bingo/web lint && pnpm --filter @bingo/web build`

Y míralo: con la colección de muestra ya sembrada con carátulas, la casilla debe poder
activarse; comprueba también el caso deshabilitado si tienes a mano una colección sin
portadas. Cuenta en el informe qué viste.

- [x] **Step 5: Commit**

```bash
git add "apps/web/src/app/dashboard/games/new/page.tsx"
git commit -m "feat(web): el wizard ofrece las portadas cuando la colección las tiene"
```

---

### Task 6: E2E, peso, verificación y documentación

**Files:**

- Create: `e2e/portadas.spec.ts`
- Modify: `CHANGELOG.md`, `PROGRESS.md`, `README.md` si documenta las opciones del bingo

- [x] **Step 1: E2E**

Dos pruebas:

1. **Con portadas**: partida de bingo con «Casillas con portada» activada; la casilla sin
   revelar lleva la clase de desenfoque y, tras el reveal, no la lleva. El título se ve en
   los dos momentos.
2. **Sin portadas**: partida de bingo normal; **no se pide ninguna imagen** de carátula
   (compruébalo con `page.on('request')` filtrando por la ruta de las carátulas).

- [x] **Step 2: Medir el peso**

El riesgo escrito en el spec: 25 imágenes en un cartón 5×5, en móviles ajenos. Con una
partida 5×5 y portadas activadas, mide cuánto pesa el conjunto de carátulas
(`page.on('response')` sumando `content-length`, o el panel de red). **Escribe la cifra en
el informe.** Si es desproporcionada para una red de salón, dilo claramente en vez de
darlo por bueno.

- [x] **Step 3: Ejecutar y validar**

```bash
docker compose up -d
pnpm --filter @bingo/shared build
pnpm exec playwright test e2e/portadas.spec.ts e2e/gameplay.spec.ts e2e/bingo-variants.spec.ts
```

Y `verify-gramola`: `pnpm test`, typecheck/lint/build de la web, typecheck de la API.

- [x] **Step 4: Documentar**

`CHANGELOG.md`, bajo `## [Unreleased]` → `### Added`:

```markdown
- Opción del bingo «Casillas con portada»: cada casilla enseña la carátula del álbum,
  desenfocada hasta que la canción se revela. Apagada por defecto y solo disponible si la
  colección tiene carátulas suficientes. La colección de muestra estrena carátulas propias.
```

`PROGRESS.md`: spec 6 del pulido posterior a v0.6.0 como hecho.

- [x] **Step 5: Commit**

```bash
git add e2e/portadas.spec.ts CHANGELOG.md PROGRESS.md README.md
git commit -m "test(e2e): el cartón con portadas se desenfoca al revelar"
```

---

## Fuera de alcance (del spec, explícito)

- Los demás modos: la portada delataría la respuesta en un quiz de título.
- El motor: ni la generación de cartones ni el marcado cambian.
- Descargar portadas comerciales al repositorio.
