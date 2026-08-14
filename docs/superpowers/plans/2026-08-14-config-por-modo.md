# Configuración específica de cada modo — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-08-11-config-por-modo-design.md` (vive en la rama
`fix/config-por-modo`; esta rama sale de `main`, así que todo lo necesario está copiado
aquí).

**Goal:** Que la interfaz deje de enseñar cosas del bingo —cartón, centro libre, premio
por línea y por bingo— en los otros cuatro modos, y que en su lugar cada modo enseñe su
propio dato.

**Architecture:** Un redactor único de resúmenes por modo en `@bingo/shared`, usado por
la API (para el DTO de sala) y por la web (para el resumen de partida). El wizard
condiciona sus secciones de bingo al modo y fuerza valores neutros al enviar. Sin
migración de esquema: `cardSize`, `freeCenter`, `lineEnabled` y `bingoEnabled` se quedan
donde están.

**Tech Stack:** NestJS 11 + Prisma en la API, Next.js 15 + react-hook-form en la web,
Zod en `@bingo/shared`, Vitest y Playwright.

## Global Constraints

- **Sin migración de esquema ni cambios en Prisma.** Los cuatro campos del bingo siguen
  en `GameSettings`. Mover a `musicBingoConfig` queda anotado como deuda consciente.
- **Sin cambios en el motor de partida** (`game-engine.service.ts`): ya se comporta bien,
  solo reparte cartones en `MUSIC_BINGO`.
- El cambio del DTO de sala es **aditivo**: `cardSize` se queda para no romper a nadie.
- Las partidas ya guardadas deben seguir abriendo igual: `modeConfig` es nulo en las
  anteriores a la épica y el redactor debe tratar el nulo como la configuración por
  defecto del modo, sin lanzar.
- Resúmenes por modo, tal y como los fija el spec:

  | Modo              | Resumen                              |
  | ----------------- | ------------------------------------ |
  | `MUSIC_BINGO`     | `cartón 3×3` (con el tamaño real)    |
  | `MULTIPLE_CHOICE` | `4 opciones por pregunta`            |
  | `FREE_TEXT`       | `2 intentos` / `intentos ilimitados` |
  | `SURVIVAL`        | `3 vidas`                            |
  | `MIXED`           | `mezcla equilibrada`                 |

- En el wizard **se quedan visibles en todos los modos**: duración del fragmento, tiempo
  extra de respuesta y toda la tarjeta «Ritmo de la partida» (revelado automático,
  encadenar rondas, pausa de resultados). También «Ranking entre rondas» y «Orden
  aleatorio», que son comunes aunque hoy vivan en la misma tarjeta que las del bingo.
- `@bingo/shared` se consume desde `dist`: tras tocarlo, `pnpm --filter @bingo/shared build`
  (o reiniciar `pnpm dev`) antes de que la API o la web lo usen.
- Turborepo usa entorno estricto: si aparece una variable nueva, se declara en
  `turbo.json`. Este plan no debería necesitar ninguna.
- Comentarios, documentación y mensajes de commit en español.
- Cualquier cambio visual pasa por `gramola-design-taste`; `DESIGN.md` manda.
- Nunca `docker compose down -v`.

## Estado actual verificado (no hace falta volver a investigarlo)

- **Wizard** (`apps/web/src/app/dashboard/games/new/page.tsx`, un solo formulario con
  `react-hook-form`):
  - `const mode = watch('mode')` (línea 143) ya existe; el archivo ya usa
    `{mode === 'MULTIPLE_CHOICE' && (…)}` para las secciones de cada modo (líneas 230,
    266, 317, 350, 422).
  - La tarjeta «Cartón» empieza en la línea 524 (`<p className="label">Cartón</p>`) y en
    la misma tarjeta viven los selectores de duración del fragmento y de tiempo extra,
    que son comunes: hay que separar lo del cartón, no ocultar la tarjeta entera.
  - La tarjeta «Reglas» (línea 629) pinta `RULE_TOGGLES` (líneas 93-99), que mezcla tres
    reglas del bingo (`freeCenter`, `lineEnabled`, `bingoEnabled`) con dos comunes
    (`showLeaderboard`, `shuffleTracks`).
  - `onSubmit` (línea 164) manda `settings` con `cardSize`, `freeCenter`, `lineEnabled` y
    `bingoEnabled` tomados del formulario, sin mirar el modo.
- **DTO de sala**: `PublicRoom` en `apps/api/src/rooms/rooms.service.ts:17-26` expone
  `cardSize` pero no el modo de juego (su `mode` es `PROJECTOR | REMOTE`). `findByCode`
  (línea 92) hace `include: { game: { select: { name: true, settings: { select: { cardSize: true } } } }, … }`.
- **Sala de espera**: `apps/web/src/app/join/[code]/page.tsx:69` pinta
  `{room.participantCount} jugadores dentro · cartón {room.cardSize}×{room.cardSize}`.
- **Resumen de partida**: `apps/web/src/app/dashboard/games/[id]/page.tsx:60` pinta
  `Cartón {game.settings?.cardSize}×{game.settings?.cardSize}`. Esa página ya recibe
  `game.modeConfig`.
- **Configuración por modo** (`packages/shared/src/game-config.ts`): `optionCount`
  (2-4, por defecto 4) en `MULTIPLE_CHOICE`; `attempts` (1-5 o `null` = ilimitados) en
  `FREE_TEXT`; `lives` (1-10, por defecto 3) en `SURVIVAL`; `preset`
  (`EQUILIBRADO | SOLO_RECONOCIMIENTO | PERSONALIZADO`) en `MIXED`.
  `readGameModeConfig(mode, stored)` (línea 178) ya devuelve la configuración por defecto
  cuando lo guardado es `null` o `undefined`.
- `packages/shared` tiene Vitest (`pnpm --filter @bingo/shared test`); `apps/api` también.
  `apps/web` **no** tiene runner en esta rama.

## Estructura de archivos

| Archivo                                                      | Responsabilidad                                          |
| ------------------------------------------------------------ | -------------------------------------------------------- |
| `packages/shared/src/mode-summary.ts` (nuevo)                | Redactor único del resumen de un modo.                   |
| `packages/shared/src/mode-summary.test.ts` (nuevo)           | Un caso por modo, más configuración nula.                |
| `packages/shared/src/index.ts` (modificar)                   | Exportar el redactor.                                    |
| `apps/api/src/rooms/rooms.service.ts` (modificar)            | `gameMode` y `modeSummary` en el DTO de sala.            |
| `apps/web/src/app/dashboard/games/new/page.tsx` (modificar)  | Secciones del bingo condicionadas y neutros en el envío. |
| `apps/web/src/app/join/[code]/page.tsx` (modificar)          | La sala de espera enseña el resumen del modo.            |
| `apps/web/src/app/dashboard/games/[id]/page.tsx` (modificar) | El resumen de partida, igual.                            |
| `e2e/config-por-modo.spec.ts` (nuevo)                        | Wizard por modo y sala de espera de un quiz.             |
| `CHANGELOG.md`, `PROGRESS.md` (modificar)                    | Registro del cambio.                                     |

---

### Task 1: Redactor de resúmenes por modo en `@bingo/shared`

**Files:**

- Create: `packages/shared/src/mode-summary.ts`
- Test: `packages/shared/src/mode-summary.test.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**

- Consumes: `GameMode`, `readGameModeConfig` de `./game-config` y `./game-modes`.
- Produces:

  ```ts
  export function describeModeSummary(
    mode: GameMode,
    storedConfig: unknown,
    cardSize?: number,
  ): string;
  ```

  Lo usarán la API (Tarea 2) y la web (Tarea 4). `cardSize` solo lo usa el bingo; con
  cualquier otro modo se ignora, y si falta se asume 3.

- [ ] **Step 1: Escribir la prueba que falla**

Crea `packages/shared/src/mode-summary.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { describeModeSummary } from './mode-summary';

describe('describeModeSummary', () => {
  it('en bingo dice el tamaño del cartón', () => {
    expect(describeModeSummary('MUSIC_BINGO', { mode: 'MUSIC_BINGO' }, 4)).toBe('cartón 4×4');
  });

  it('en bingo sin tamaño cae en el 3×3, que es el de Prisma', () => {
    expect(describeModeSummary('MUSIC_BINGO', { mode: 'MUSIC_BINGO' })).toBe('cartón 3×3');
  });

  it('en quiz dice cuántas opciones tiene cada pregunta', () => {
    expect(
      describeModeSummary('MULTIPLE_CHOICE', { mode: 'MULTIPLE_CHOICE', optionCount: 3 }),
    ).toBe('3 opciones por pregunta');
  });

  it('en adivinanza dice los intentos, y los ilimitados se dicen con palabras', () => {
    expect(describeModeSummary('FREE_TEXT', { mode: 'FREE_TEXT', attempts: 2 })).toBe('2 intentos');
    expect(describeModeSummary('FREE_TEXT', { mode: 'FREE_TEXT', attempts: 1 })).toBe('1 intento');
    expect(describeModeSummary('FREE_TEXT', { mode: 'FREE_TEXT', attempts: null })).toBe(
      'intentos ilimitados',
    );
  });

  it('en supervivencia dice las vidas, en singular cuando es una', () => {
    expect(describeModeSummary('SURVIVAL', { mode: 'SURVIVAL', lives: 5 })).toBe('5 vidas');
    expect(describeModeSummary('SURVIVAL', { mode: 'SURVIVAL', lives: 1 })).toBe('1 vida');
  });

  it('en mixto dice qué mezcla es', () => {
    expect(describeModeSummary('MIXED', { mode: 'MIXED', preset: 'EQUILIBRADO' })).toBe(
      'mezcla equilibrada',
    );
    expect(describeModeSummary('MIXED', { mode: 'MIXED', preset: 'SOLO_RECONOCIMIENTO' })).toBe(
      'solo reconocimiento',
    );
    expect(describeModeSummary('MIXED', { mode: 'MIXED', preset: 'PERSONALIZADO' })).toBe(
      'mezcla personalizada',
    );
  });

  /*
   * Las partidas anteriores a la épica tienen `modeConfig` nulo. Abrir su
   * historial no puede reventar: se lee como la configuración por defecto,
   * igual que ya hace `readGameModeConfig`.
   */
  it('con configuración nula usa la de por defecto del modo, sin lanzar', () => {
    expect(describeModeSummary('SURVIVAL', null)).toBe('3 vidas');
    expect(describeModeSummary('MULTIPLE_CHOICE', undefined)).toBe('4 opciones por pregunta');
    expect(describeModeSummary('MUSIC_BINGO', null, 5)).toBe('cartón 5×5');
  });

  it('con configuración corrupta no revienta la pantalla: cae en la de por defecto', () => {
    expect(describeModeSummary('SURVIVAL', { mode: 'SURVIVAL', lives: 'muchas' })).toBe('3 vidas');
  });
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `pnpm --filter @bingo/shared test`
Expected: FAIL — no existe `./mode-summary`.

- [ ] **Step 3: Implementar el redactor**

Crea `packages/shared/src/mode-summary.ts`:

```ts
import { readGameModeConfig, type MixedConfig } from './game-config';
import type { GameMode } from './game-modes';

const MIXED_SUMMARIES: Record<MixedConfig['preset'], string> = {
  EQUILIBRADO: 'mezcla equilibrada',
  SOLO_RECONOCIMIENTO: 'solo reconocimiento',
  PERSONALIZADO: 'mezcla personalizada',
};

/**
 * El dato que resume una partida en una línea, según su modo.
 *
 * Existe porque la sala de espera y el resumen de partida enseñaban «cartón
 * N×N» en los cinco modos, incluso en un quiz donde no hay ningún cartón. Se
 * redacta en un solo sitio para que la API y la web no digan cosas distintas.
 *
 * Nunca lanza: una configuración nula (partidas anteriores a la épica) o
 * corrupta cae en la de por defecto del modo. Esto es una etiqueta de
 * pantalla, no una regla de juego; negarse a pintarla no protege de nada y
 * deja al anfitrión sin poder abrir su historial.
 */
export function describeModeSummary(mode: GameMode, storedConfig: unknown, cardSize = 3): string {
  let config;
  try {
    config = readGameModeConfig(mode, storedConfig);
  } catch {
    config = readGameModeConfig(mode, null);
  }

  switch (config.mode) {
    case 'MUSIC_BINGO':
      return `cartón ${cardSize}×${cardSize}`;
    case 'MULTIPLE_CHOICE':
      return `${config.optionCount} opciones por pregunta`;
    case 'FREE_TEXT':
      if (config.attempts === null) return 'intentos ilimitados';
      return config.attempts === 1 ? '1 intento' : `${config.attempts} intentos`;
    case 'SURVIVAL':
      return config.lives === 1 ? '1 vida' : `${config.lives} vidas`;
    case 'MIXED':
      return MIXED_SUMMARIES[config.preset];
  }
}
```

- [ ] **Step 4: Exportarlo**

En `packages/shared/src/index.ts`, añade la reexportación junto a las demás, siguiendo el
estilo del archivo (`export * from './mode-summary';` si ese es el patrón que usa).

- [ ] **Step 5: Ejecutar y comprobar que pasa**

Run: `pnpm --filter @bingo/shared test && pnpm --filter @bingo/shared build`
Expected: PASS y compilación limpia. El `build` es obligatorio: la API y la web consumen
`dist`.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/mode-summary.ts packages/shared/src/mode-summary.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): redactor del resumen de cada modo"
```

---

### Task 2: El DTO de sala expone el modo y su resumen

**Files:**

- Modify: `apps/api/src/rooms/rooms.service.ts:17-26` (tipo `PublicRoom`) y `:92-113`
  (`findByCode`)

**Interfaces:**

- Consumes: `describeModeSummary` de `@bingo/shared` (Tarea 1).
- Produces: `PublicRoom` gana dos campos, que consume la web en la Tarea 4:

  ```ts
  gameMode: GameMode;
  modeSummary: string;
  ```

- [ ] **Step 1: Ampliar el tipo**

En `PublicRoom`, añade los dos campos después de `gameName`, dejando `cardSize` donde
está (el cambio es aditivo a propósito: nadie que lo consuma hoy debe romperse):

```ts
export type PublicRoom = {
  id: string;
  code: string;
  mode: string;
  status: string;
  gameName: string;
  /** El modo de juego. `mode`, arriba, es otra cosa: proyector o mando. */
  gameMode: GameMode;
  /** La línea que la sala de espera enseña en lugar del cartón. */
  modeSummary: string;
  cardSize: number;
  participantCount: number;
  locked: boolean;
};
```

Importa `describeModeSummary` y el tipo `GameMode` de `@bingo/shared` junto a los imports
que ya haya del paquete.

- [ ] **Step 2: Traer el modo y la configuración en la consulta**

En `findByCode`, amplía el `select` de `game` para incluir lo que hace falta:

```ts
        game: {
          select: { name: true, mode: true, modeConfig: true, settings: { select: { cardSize: true } } },
        },
```

- [ ] **Step 3: Rellenar los dos campos en la respuesta**

En el objeto que devuelve `findByCode`:

```ts
const cardSize = room.game.settings?.cardSize ?? 3;
return {
  id: room.id,
  code: room.code,
  mode: room.mode,
  status: room.status,
  gameName: room.game.name,
  gameMode: room.game.mode,
  modeSummary: describeModeSummary(room.game.mode, room.game.modeConfig, cardSize),
  cardSize,
  participantCount: room._count.participants,
  locked: room.lockedAt !== null,
};
```

Si el tipo de `room.game.mode` que devuelve Prisma no encaja con `GameMode`, no lo
resuelvas con `as any`: mira cómo se convierte en otros puntos de la API (por ejemplo
donde se resuelve el handler del modo) y usa el mismo patrón.

- [ ] **Step 4: Comprobar tipos y tests de la API**

Run: `pnpm --filter @bingo/api typecheck && pnpm --filter @bingo/api test`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/rooms/rooms.service.ts
git commit -m "feat(api): la sala expone su modo de juego y el resumen"
```

---

### Task 3: El wizard solo enseña lo del bingo cuando toca

**Files:**

- Modify: `apps/web/src/app/dashboard/games/new/page.tsx` (constante `RULE_TOGGLES`
  líneas 93-99, tarjeta «Cartón» desde la línea 524, tarjeta «Reglas» línea 629, y
  `onSubmit` línea 164)

**Interfaces:**

- Consumes: la variable `mode` que ya existe (`const mode = watch('mode')`, línea 143).
- Produces: nada que consuman otras tareas.

- [ ] **Step 1: Separar las reglas del bingo de las comunes**

Sustituye la constante `RULE_TOGGLES` por dos, conservando textos y orden actuales:

```tsx
/* Reglas que solo existen si hay cartón. */
const BINGO_RULE_TOGGLES = [
  ['freeCenter', 'Centro libre', 'La casilla central cuenta como acertada (3×3 y 5×5).'],
  ['lineEnabled', 'Premio por línea', 'Los jugadores pueden cantar línea.'],
  ['bingoEnabled', 'Premio por bingo', 'Los jugadores pueden cantar bingo (termina la partida).'],
] as const;

/* Reglas de cualquier partida, juegue al modo que juegue. */
const COMMON_RULE_TOGGLES = [
  ['showLeaderboard', 'Ranking entre rondas', 'Muestra la clasificación tras cada canción.'],
  ['shuffleTracks', 'Orden aleatorio', 'Baraja las canciones al empezar.'],
] as const;
```

- [ ] **Step 2: Condicionar el selector de cartón**

En la tarjeta que empieza con `<p className="label">Cartón</p>` (línea 524), **solo** el
rótulo «Cartón» y el bloque de los tres botones 3×3 / 4×4 / 5×5 se condicionan a
`mode === 'MUSIC_BINGO'`. Los selectores de duración del fragmento y de tiempo extra que
viven en esa misma tarjeta son comunes y se quedan siempre visibles. Si al ocultar el
rótulo la tarjeta queda sin encabezado en los demás modos, dale el rótulo que le
corresponda a lo que sí enseña (por ejemplo «Tiempos»), aplicando `gramola-design-taste`
para no inventar un estilo nuevo.

- [ ] **Step 3: Condicionar las reglas del bingo**

En la tarjeta «Reglas» (línea 629), pinta `BINGO_RULE_TOGGLES` solo cuando
`mode === 'MUSIC_BINGO'` y `COMMON_RULE_TOGGLES` siempre, en ese orden, dentro del mismo
contenedor y con el mismo marcado que hoy (no dupliques el `<label>`: extrae el mapeo a
una constante o a un pequeño componente local si hace falta, pero sin copiar el bloque
dos veces).

- [ ] **Step 4: Forzar valores neutros al enviar fuera del bingo**

Ocultar un campo registrado en `react-hook-form` **no lo desregistra**: si alguien
empieza en bingo, marca «Premio por línea» y luego cambia a quiz, el valor sigue en el
formulario. Por eso el envío decide, no el estado del formulario. En `onSubmit`, sustituye
las cuatro líneas correspondientes de `settings`:

```tsx
          settings: {
            // Fuera del bingo estos cuatro no significan nada, y guardar lo que
            // quedara en el formulario haría que el dato contradijera a la
            // partida jugada. `cardSize` mantiene 3 porque la columna no admite
            // nulo y es su valor por defecto en Prisma.
            ...(data.mode === 'MUSIC_BINGO'
              ? {
                  cardSize: Number(data.cardSize),
                  freeCenter: data.freeCenter,
                  lineEnabled: data.lineEnabled,
                  bingoEnabled: data.bingoEnabled,
                }
              : { cardSize: 3, freeCenter: false, lineEnabled: false, bingoEnabled: false }),
            snippetDurationMs: Number(data.snippetDurationMs),
            answerWindowMs: Number(data.answerWindowMs),
            autoReveal: data.autoReveal,
            autoAdvance: data.autoAdvance,
            roundResultsMs: Number(data.roundResultsMs),
            showLeaderboard: data.showLeaderboard,
            shuffleTracks: data.shuffleTracks,
          },
```

- [ ] **Step 5: Comprobar tipos, estilo y build**

Run: `pnpm --filter @bingo/web typecheck && pnpm --filter @bingo/web lint && pnpm --filter @bingo/web build`
Expected: sin errores.

- [ ] **Step 6: Mirarlo de verdad**

Con `pnpm dev` levantado, abre `/dashboard/games/new` y cambia de modo:

- En **Bingo musical** aparecen los botones de cartón y las tres reglas del bingo.
- En **quiz**, **adivina la canción**, **supervivencia** y **mixto** no aparece ninguno
  de esos cuatro, pero sí siguen la duración del fragmento, el tiempo extra, la tarjeta
  «Ritmo de la partida», «Ranking entre rondas» y «Orden aleatorio».
- Ninguna tarjeta queda vacía ni descolocada al cambiar de modo.

- [ ] **Step 7: Commit**

```bash
git add "apps/web/src/app/dashboard/games/new/page.tsx"
git commit -m "feat(web): el wizard solo enseña lo del bingo en el bingo"
```

---

### Task 4: La sala de espera y el resumen de partida hablan de su modo

**Files:**

- Modify: `apps/web/src/app/join/[code]/page.tsx:69` y el tipo de sala que use ese archivo
- Modify: `apps/web/src/app/dashboard/games/[id]/page.tsx:60`

**Interfaces:**

- Consumes: `modeSummary` del DTO de sala (Tarea 2) y `describeModeSummary` de
  `@bingo/shared` (Tarea 1).
- Produces: nada que consuman otras tareas.

- [ ] **Step 1: Sala de espera**

En `apps/web/src/app/join/[code]/page.tsx`, añade `modeSummary: string` (y `gameMode`, si
el archivo tipa la sala a mano) al tipo local de la sala, y cambia la línea 69:

```tsx
              {room.participantCount} jugadores dentro · {room.modeSummary}
```

`cardSize` deja de usarse aquí; si el tipo local lo declara y ya no lo lee nadie, quítalo
de ese tipo local (no del DTO de la API, que se queda).

- [ ] **Step 2: Resumen de partida**

En `apps/web/src/app/dashboard/games/[id]/page.tsx`, sustituye
`Cartón {game.settings?.cardSize}×{game.settings?.cardSize}` por el resumen del modo,
usando la misma función que la API:

```tsx
            {game.collection.name} · {game.collection.trackCount} canciones ·{' '}
            {describeModeSummary(game.mode, game.modeConfig, game.settings?.cardSize)} ·{' '}
            {(game.settings?.snippetDurationMs ?? 15000) / 1000}s por ronda
```

Añade el import de `describeModeSummary` desde `@bingo/shared` y, si el tipo local de la
partida no declara `mode` y `modeConfig`, decláralos (la API ya los devuelve en esta
pantalla; compruébalo antes de asumirlo y, si no vinieran, dilo en el informe en lugar de
inventar el dato).

- [ ] **Step 3: Comprobar tipos, estilo y build**

Run: `pnpm --filter @bingo/web typecheck && pnpm --filter @bingo/web lint && pnpm --filter @bingo/web build`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/src/app/join/[code]/page.tsx" "apps/web/src/app/dashboard/games/[id]/page.tsx"
git commit -m "feat(web): la sala de espera y el resumen hablan de su modo"
```

---

### Task 5: E2E del wizard por modo y de la sala de espera

**Files:**

- Create: `e2e/config-por-modo.spec.ts`

**Interfaces:**

- Consumes: `loginAsHost` y los helpers de `e2e/helpers.ts`; mira cómo
  `e2e/quiz.spec.ts` y `e2e/gameplay.spec.ts` crean partidas de cada modo y reutiliza ese
  camino en lugar de inventar uno nuevo.

- [ ] **Step 1: Escribir las pruebas**

Crea `e2e/config-por-modo.spec.ts` con tres pruebas:

1. **El bingo sigue enseñando lo suyo.** Entra como anfitrión, abre
   `/dashboard/games/new`, con el modo «Bingo musical» seleccionado, y comprueba que se
   ven los cuatro: el selector de cartón (`3 × 3`), «Centro libre», «Premio por línea» y
   «Premio por bingo».
2. **Los otros cuatro modos no lo enseñan.** En el mismo formulario, para cada modo no
   bingo (quiz, adivina la canción, supervivencia y mixto), comprueba que ninguno de esos
   cuatro está visible, y que sí siguen visibles «Ranking entre rondas» y «Orden
   aleatorio». Hazlo con un bucle sobre los nombres de los modos tal y como aparecen en
   el selector, sin duplicar el cuerpo de la prueba cinco veces.
3. **La sala de espera de un quiz no habla de cartones.** Crea una partida de quiz, abre
   su sala, ve a `/join/<código>` y comprueba que el texto de cabecera **no** contiene
   «cartón» y que sí contiene el resumen del modo (`opciones por pregunta`).

Usa selectores por rol y texto visible, como el resto de la suite. Si un selector no
encaja, corrige el selector, nunca el copy de la aplicación.

- [ ] **Step 2: Levantar el entorno y ejecutar**

Run:

```bash
docker compose up -d
pnpm --filter @bingo/shared build
pnpm exec playwright test e2e/config-por-modo.spec.ts
```

Expected: 3 passed. Si falla por selectores, ajústalos y vuelve a ejecutar. Si falla por
comportamiento, es un fallo real: arréglalo en el código de la tarea correspondiente y
dilo en el informe.

- [ ] **Step 3: Commit**

```bash
git add e2e/config-por-modo.spec.ts
git commit -m "test(e2e): cada modo enseña su configuración y no la del bingo"
```

---

### Task 6: Verificación completa y documentación

**Files:**

- Modify: `CHANGELOG.md` (sección `## [Unreleased]` → `### Changed`; créala encima de
  `## [0.6.0] - 2026-08-11` si no existe)
- Modify: `PROGRESS.md`

- [ ] **Step 1: Revisar el propio diff**

Run: `git diff main --stat && git diff main`
Comprueba que no hay cambios en Prisma, ni en el motor de partida, ni nada ajeno colado.
`.codegraph/daemon.pid` no se commitea.

- [ ] **Step 2: Validación**

Aplica la skill `verify-gramola` y ejecuta lo que indique. Como suelo:

```bash
pnpm --filter @bingo/shared build
pnpm test
pnpm --filter @bingo/web typecheck && pnpm --filter @bingo/web lint && pnpm --filter @bingo/web build
pnpm exec playwright test e2e/config-por-modo.spec.ts e2e/quiz.spec.ts e2e/gameplay.spec.ts
```

La suite E2E completa tiene inestabilidad conocida y anterior, reproducida también en
`main`. Si falla algo fuera de esos tres archivos, compruébalo en `main` antes de
tratarlo como regresión.

- [ ] **Step 3: Documentar**

En `CHANGELOG.md`, bajo `## [Unreleased]` → `### Changed`:

```markdown
- Cada modo enseña su propia configuración: el cartón y las reglas de línea y bingo solo
  aparecen en el bingo, y la sala de espera y el resumen de partida dicen el dato que
  corresponde a cada modo (opciones, intentos, vidas o mezcla).
```

En `PROGRESS.md`, anota como hecho el spec 1 del pulido posterior a v0.6.0
(«Configuración específica de cada modo»), con el formato de las entradas vecinas. Si la
referencia al índice de specs no existe en esta rama, redáctalo sin enlazar a un archivo
que no está aquí.

Anota también, en el mismo apunte, la deuda consciente: mover `cardSize`, `freeCenter`,
`lineEnabled` y `bingoEnabled` a `musicBingoConfig` sigue pendiente y exigiría migración.

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md PROGRESS.md
git commit -m "docs: registra la configuración específica de cada modo"
```

---

## Fuera de alcance (del spec, explícito)

- El esquema de Prisma y sus migraciones.
- El motor de partida, que ya ignora lo del bingo fuera del bingo.
- Las partidas ya guardadas: siguen abriendo igual, con su `cardSize` histórico.
