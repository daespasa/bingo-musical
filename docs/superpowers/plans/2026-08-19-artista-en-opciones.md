# Artista en las opciones del quiz — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-08-11-artista-en-opciones-del-quiz-design.md` (vive
en la rama `fix/config-por-modo`; todo lo necesario está copiado aquí).

**Goal:** Que en la pregunta «¿Cómo se llama esta canción?» cada opción lleve el artista
debajo del título, para que dos canciones homónimas se distingan y quien reconoce la voz
tenga por dónde agarrarse.

**Architecture:** La opción deja de ser texto plano y pasa a ser `{ text, subtitle }` de
punta a punta: constructor de preguntas → payload del handler → vista pública →
persistencia (`AnswerOption.subtitle`, migración aditiva) → interfaz. El subtítulo se
rellena **solo** en preguntas de tipo `SONG_TITLE`; en las demás es `null`.

**Tech Stack:** Prisma en `packages/database`, NestJS en `apps/api`, contratos en
`@bingo/shared`, Next.js en `apps/web`, Vitest y Playwright.

## Global Constraints

- **Solo `SONG_TITLE` lleva subtítulo.** En una pregunta de tipo `ARTIST` el artista _es_
  la respuesta: enseñarlo bajo cada opción la regalaría. Esto va escrito en un test, no
  solo en un comentario.
- El subtítulo se **persiste**, no se deriva en cada emisión: quien reconecta a mitad de
  ronda tiene que ver exactamente las mismas opciones que los demás.
- Migración **aditiva**: `subtitle String?` en `AnswerOption`. Las preguntas ya guardadas
  quedan con `subtitle` nulo y el historial debe seguir abriéndolas sin reescribir nada.
- Nada que delate la solución puede viajar antes del reveal: el subtítulo existe para las
  cuatro opciones o para ninguna, nunca solo para la correcta.
- El determinismo por ronda no cambia: misma semilla, mismo orden y mismos pares
  título/artista. El subtítulo viaja pegado a su opción al barajar.
- Los distractores siguen saliendo de la propia colección y **no** se filtran por artista:
  cambiar eso cambiaría la dificultad, que es otra discusión.
- Cuando `subtitle` es nulo, el botón se renderiza exactamente como hoy, sin hueco
  reservado.
- `@bingo/shared` se consume desde `dist`: tras tocarlo, `pnpm --filter @bingo/shared build`.
- Comentarios, documentación y mensajes de commit en español.
- Lo visual pasa por `gramola-design-taste`; `DESIGN.md` manda.
- Nunca `docker compose down -v`.

## Estado actual verificado (no hace falta volver a investigarlo)

- `apps/api/src/game-modes/question-builder.ts`: `QuizQuestionDraft.options` es `string[]`
  (línea 19). `correctAnswerFor` (39) devuelve el texto correcto por tipo;
  `distractorsFor` (75) devuelve `string[]` a partir de `correctAnswerFor` sobre las demás
  pistas del pool; `buildQuizQuestion` (120) baraja `[correct, ...distractors]` con
  `seededShuffle`.
- `apps/api/src/game-modes/multiple-choice.handler.ts`: `QuizRoundPayload.options` es
  `string[]` (31) y `correctIndex` se calcula con `draft.options.indexOf(draft.correctText)`
  (82). `QuizRoundPublicView` (136) y `toPublicQuizRound` (142) son el **único** punto por
  el que la ronda sale hacia la red.
- `apps/api/src/realtime/game-engine.service.ts:575-581`: persiste las opciones con
  `payload.options.map((text, position) => ({ position, text, isCorrect: position === payload.correctIndex }))`.
- `packages/database/prisma/schema.prisma:531-543`: modelo `AnswerOption` con
  `position`, `text`, `isCorrect`, sin subtítulo. Última migración:
  `20260810103934_add_player_life_state`.
- `packages/shared/src/contracts.ts:186-190`: `QuizQuestionView = { type, prompt, options: string[] }`.
- `apps/web/src/components/quiz-options.tsx`: pinta cada opción con
  `<span className="min-w-0 flex-1 font-semibold leading-tight">{option}</span>` dentro de
  un botón `min-h-14`, con `key={option}` y un `aria-label` compuesto a mano.
- `apps/web/src/app/room/[code]/screen/page.tsx:135-165`: el proyector pinta las mismas
  opciones a tamaño de sala, también con `key={option}`.
- Tests existentes que tocan esto: `apps/api/src/game-modes/question-builder.test.ts` y
  `apps/api/src/game-modes/multiple-choice.handler.test.ts`.

## Estructura de archivos

| Archivo                                                   | Responsabilidad                              |
| --------------------------------------------------------- | -------------------------------------------- |
| `packages/database/prisma/schema.prisma` (modificar)      | `subtitle String?` en `AnswerOption`.        |
| `packages/database/prisma/migrations/…` (nuevo)           | Migración aditiva.                           |
| `apps/api/src/game-modes/question-builder.ts` (modificar) | La opción pasa a `{ text, subtitle }`.       |
| `apps/api/src/game-modes/question-builder.test.ts`        | Subtítulo por tipo y determinismo.           |
| `apps/api/src/game-modes/multiple-choice.handler.ts`      | Payload y vista pública con subtítulo.       |
| `apps/api/src/realtime/game-engine.service.ts`            | Persistir el subtítulo.                      |
| `packages/shared/src/contracts.ts` (modificar)            | `QuizQuestionView.options` con subtítulo.    |
| `apps/web/src/components/quiz-options.tsx`                | Opción a dos líneas.                         |
| `apps/web/src/app/room/[code]/screen/page.tsx`            | Igual, en el proyector.                      |
| `e2e/quiz.spec.ts` (modificar)                            | El artista se ve y la solución sigue oculta. |
| `CHANGELOG.md`, `PROGRESS.md`                             | Registro.                                    |

---

### Task 1: Migración aditiva de `AnswerOption`

**Files:**

- Modify: `packages/database/prisma/schema.prisma:531-543`
- Create: la migración que genere Prisma

**Interfaces:**

- Produces: columna `subtitle` (texto, nullable) en `AnswerOption`, que la Tarea 4
  rellenará al persistir.

- [ ] **Step 1: Añadir el campo**

En el modelo `AnswerOption`, debajo de `text`:

```prisma
  /// Línea secundaria de la opción. Hoy el artista en las preguntas de título;
  /// nulo cuando el tipo de pregunta no lo admite.
  subtitle   String?
```

- [ ] **Step 2: Generar y aplicar la migración**

Run:

```bash
docker compose up -d bingo-postgres bingo-redis
pnpm --filter @bingo/database migrate:dev --name add_answer_option_subtitle
```

Expected: una migración nueva con un único `ALTER TABLE ... ADD COLUMN "subtitle" TEXT;`.
Ábrela y compruébalo: si Prisma propone borrar o recrear algo, **para** y dilo en el
informe, porque hay datos reales en esa tabla.

- [ ] **Step 3: Comprobar que el cliente se regenera y compila**

Run: `pnpm --filter @bingo/database build && pnpm --filter @bingo/api typecheck`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add packages/database/prisma
git commit -m "feat(db): la opción de una pregunta admite línea secundaria"
```

---

### Task 2: El constructor de preguntas devuelve título y subtítulo

**Files:**

- Modify: `apps/api/src/game-modes/question-builder.ts`
- Test: `apps/api/src/game-modes/question-builder.test.ts`

**Interfaces:**

- Produces:

  ```ts
  export type QuizOptionDraft = { text: string; subtitle: string | null };
  export type QuizQuestionDraft = {
    type: MultipleChoiceQuestionType;
    prompt: string;
    correctText: string;
    options: QuizOptionDraft[];
  };
  ```

  Lo consumen la Tarea 3 (handler) y, a través de ella, el motor y la web.

- [ ] **Step 1: Escribir las pruebas que fallan**

Añade a `apps/api/src/game-modes/question-builder.test.ts` (respeta el estilo y los
helpers que ya tenga el archivo para construir pistas de prueba; no dupliques fábricas):

```ts
describe('subtítulo de las opciones', () => {
  it('en SONG_TITLE cada opción trae el artista de SU canción, no el de la que suena', () => {
    const draft = buildQuizQuestion({
      type: 'SONG_TITLE',
      track: pool[0]!,
      pool,
      optionCount: 4,
      rng: createRng('semilla'),
    })!;

    for (const option of draft.options) {
      const suya = pool.find((t) => t.title === option.text)!;
      expect(option.subtitle).toBe(suya.artist);
    }
  });

  it('en ARTIST no hay subtítulo: sería regalar la respuesta', () => {
    const draft = buildQuizQuestion({
      type: 'ARTIST',
      track: pool[0]!,
      pool,
      optionCount: 4,
      rng: createRng('semilla'),
    })!;
    expect(draft.options.every((o) => o.subtitle === null)).toBe(true);
  });

  it('en DECADE tampoco', () => {
    const draft = buildQuizQuestion({
      type: 'DECADE',
      track: pool[0]!,
      pool,
      optionCount: 4,
      rng: createRng('semilla'),
    })!;
    expect(draft.options.every((o) => o.subtitle === null)).toBe(true);
  });

  it('la misma semilla da el mismo orden y los mismos pares título/artista', () => {
    const uno = buildQuizQuestion({
      type: 'SONG_TITLE',
      track: pool[0]!,
      pool,
      optionCount: 4,
      rng: createRng('misma'),
    })!;
    const dos = buildQuizQuestion({
      type: 'SONG_TITLE',
      track: pool[0]!,
      pool,
      optionCount: 4,
      rng: createRng('misma'),
    })!;
    expect(dos.options).toEqual(uno.options);
  });
});
```

Si el archivo no tiene ya un `pool` de pistas de prueba con artistas distintos, créalo con
al menos cinco pistas, dos de ellas con el mismo título y distinto artista.

- [ ] **Step 2: Verlas fallar**

Run: `pnpm --filter @bingo/api test question-builder`
Expected: FAIL (las opciones son strings, no objetos).

- [ ] **Step 3: Implementar**

En `question-builder.ts`:

- Añade el tipo `QuizOptionDraft` y cambia `QuizQuestionDraft.options`.
- Haz que `distractorsFor` devuelva `QuizOptionDraft[]`: al recorrer el pool ya tienes la
  pista `other`, así que el artista está disponible sin consultas nuevas. La deduplicación
  actual (`candidates: Set<string>`) debe seguir siendo por **texto**, no por par: dos
  pistas homónimas de artistas distintos no pueden aparecer las dos como opciones, porque
  entonces habría dos respuestas correctas.
- El relleno de décadas produce opciones con `subtitle: null`.
- El subtítulo solo se rellena cuando `type === 'SONG_TITLE'`. Escríbelo en **un solo
  sitio** (una función `subtitleFor(type, track)` o equivalente), no repartido por el
  archivo, y coméntalo explicando por qué en `ARTIST` sería regalar la respuesta.
- `buildQuizQuestion` baraja las opciones ya emparejadas.

- [ ] **Step 4: Verlas pasar**

Run: `pnpm --filter @bingo/api test question-builder`
Expected: PASS, incluidos los tests que ya existían (adáptalos al nuevo tipo si comparan
`options` con strings sueltos; adaptarlos es correcto, debilitarlos no).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/game-modes/question-builder.ts apps/api/src/game-modes/question-builder.test.ts
git commit -m "feat(api): las opciones del quiz llevan artista en las preguntas de título"
```

---

### Task 3: Payload, vista pública y contrato compartido

**Files:**

- Modify: `apps/api/src/game-modes/multiple-choice.handler.ts`
- Modify: `packages/shared/src/contracts.ts:186-190`
- Test: `apps/api/src/game-modes/multiple-choice.handler.test.ts`

**Interfaces:**

- Consumes: `QuizOptionDraft` de la Tarea 2.
- Produces:

  ```ts
  // multiple-choice.handler.ts
  export type QuizOption = { text: string; subtitle: string | null };
  // QuizRoundPayload.options: QuizOption[]
  // QuizRoundPublicView.options: QuizOption[]

  // @bingo/shared contracts.ts
  export type QuizOptionView = { text: string; subtitle: string | null };
  // QuizQuestionView.options: QuizOptionView[]
  ```

  Lo consumen el motor (Tarea 4) y la web (Tarea 5).

- [ ] **Step 1: Escribir la prueba que falla**

En `multiple-choice.handler.test.ts`, añade que la vista pública conserva los subtítulos y
sigue sin llevar la solución:

```ts
it('la vista pública lleva los subtítulos y sigue sin decir cuál es la correcta', () => {
  const publica = toPublicQuizRound(payload) as Record<string, unknown>;
  expect(publica.options).toEqual(payload.options);
  expect(publica).not.toHaveProperty('correctText');
  expect(publica).not.toHaveProperty('correctIndex');
});
```

Constrúyete el `payload` con el handler igual que hagan las pruebas que ya existen en ese
archivo.

- [ ] **Step 2: Verla fallar**

Run: `pnpm --filter @bingo/api test multiple-choice`

- [ ] **Step 3: Implementar**

- `QuizRoundPayload.options` pasa a `QuizOption[]`.
- `correctIndex` ya no puede calcularse con `indexOf(correctText)`: usa
  `draft.options.findIndex((o) => o.text === draft.correctText)`.
- `QuizRoundPublicView.options` y `toPublicQuizRound` conservan el par completo. No añadas
  nada más a la vista pública: sigue siendo el único punto por el que la ronda sale a la
  red.
- En `packages/shared/src/contracts.ts`, `QuizQuestionView.options` pasa a
  `QuizOptionView[]`, con un comentario en español diciendo que el subtítulo existe para
  todas las opciones o para ninguna, para que no se pueda inferir la solución.
- Ejecuta `pnpm --filter @bingo/shared build`.

- [ ] **Step 4: Verlas pasar y comprobar tipos**

Run: `pnpm --filter @bingo/shared build && pnpm --filter @bingo/api test && pnpm --filter @bingo/api typecheck`
Expected: PASS. Si `typecheck` señala otros consumidores de `options` (por ejemplo el
motor), **no los arregles aquí**: anótalos en el informe; son la Tarea 4.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/game-modes/multiple-choice.handler.ts apps/api/src/game-modes/multiple-choice.handler.test.ts packages/shared/src/contracts.ts
git commit -m "feat(api): el contrato de la ronda de quiz lleva el subtítulo de cada opción"
```

---

### Task 4: El motor persiste el subtítulo

**Files:**

- Modify: `apps/api/src/realtime/game-engine.service.ts:575-581`

**Interfaces:**

- Consumes: `QuizRoundPayload.options` (Tarea 3) y la columna `subtitle` (Tarea 1).

- [ ] **Step 1: Persistir el par completo**

```ts
        options: {
          create: payload.options.map((option, position) => ({
            position,
            text: option.text,
            subtitle: option.subtitle,
            isCorrect: position === payload.correctIndex,
          })),
        },
```

- [ ] **Step 2: Buscar el resto de consumidores**

Run: `rg -n "\.options" apps/api/src apps/web/src packages/shared/src | rg -v "test|node_modules"`
Revisa cada resultado: cualquier sitio que tratara una opción como string (historial,
resumen de ronda, reconexión) tiene que leer `option.text`. Arregla los que estén rotos y
enumera en el informe los que revisaste y no hizo falta tocar.

- [ ] **Step 3: Comprobar**

Run: `pnpm --filter @bingo/api typecheck && pnpm --filter @bingo/api test`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src
git commit -m "feat(api): guarda el subtítulo de cada opción con la pregunta"
```

---

### Task 5: La opción, a dos líneas

**Files:**

- Modify: `apps/web/src/components/quiz-options.tsx`
- Modify: `apps/web/src/app/room/[code]/screen/page.tsx:135-165`

**Interfaces:**

- Consumes: `QuizQuestionView.options` (Tarea 3).

- [ ] **Step 1: Jugador**

En `quiz-options.tsx`:

- `key={option}` ya no vale: usa `key={option.text}` solo si es único, y si no, el índice.
- El texto pasa a dos líneas: el título con el peso actual y, cuando `option.subtitle` no
  es nulo, el artista debajo en `text-sm` y color secundario (los mismos tokens que ya usa
  el archivo para texto secundario: `text-slate-500 dark:text-slate-400`). Cuando es nulo,
  el botón queda **exactamente** como hoy, sin hueco reservado.
- El `aria-label` incluye el artista cuando existe: `Opción A: Flowers, de Miley Cyrus`.
  Sin subtítulo, el nombre accesible no cambia respecto a hoy.
- No toques la barra del reparto, los estados de revelado ni los colores.

- [ ] **Step 2: Proyector**

En `screen/page.tsx`, el mismo cambio a tamaño de sala: título como está y artista debajo,
un escalón por debajo en tamaño. Sin clases nuevas fuera del sistema.

- [ ] **Step 3: Comprobar**

Run: `pnpm --filter @bingo/shared build && pnpm --filter @bingo/web typecheck && pnpm --filter @bingo/web lint && pnpm --filter @bingo/web build`

- [ ] **Step 4: Mirarlo a 360×640**

El riesgo del spec: cuatro opciones a dos líneas con el reproductor visible. Con la
aplicación levantada y una partida de quiz en curso, haz una captura de la pantalla del
jugador a 360×640, **mírala** y comprueba que las cuatro opciones caben sin scroll y que
el objetivo táctil no baja de 44 px. Cuenta en el informe qué viste. Si no caben, dilo:
la solución (acortar, apilar o reducir) es una decisión de diseño que hay que tomar con el
dato delante, no a ciegas.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): cada opción del quiz enseña el artista bajo el título"
```

---

### Task 6: E2E, verificación y documentación

**Files:**

- Modify: `e2e/quiz.spec.ts`
- Modify: `CHANGELOG.md`, `PROGRESS.md`

- [ ] **Step 1: Ampliar el E2E de quiz**

En la prueba que ya recorre una partida de quiz, añade que en una pregunta de título se
ven los artistas de las cuatro opciones y que **antes del reveal** la solución sigue sin
aparecer (ni por texto ni en el DOM). Reutiliza los selectores del archivo; si hace falta
uno nuevo, que sea por rol o texto visible.

- [ ] **Step 2: Ejecutar**

Run:

```bash
docker compose up -d
pnpm --filter @bingo/shared build
pnpm exec playwright test e2e/quiz.spec.ts e2e/mixed.spec.ts e2e/survival.spec.ts
```

Expected: todo en verde. `mixed` y `survival` entran porque reutilizan el handler de quiz.

- [ ] **Step 3: Validación completa**

Aplica `verify-gramola`. Como suelo: `pnpm test`, typecheck/lint/build de `@bingo/web`, y
`pnpm --filter @bingo/api typecheck`. La suite E2E completa tiene inestabilidad conocida y
anterior, reproducida también en `main`.

- [ ] **Step 4: Documentar**

`CHANGELOG.md`, bajo `## [Unreleased]` → `### Changed`:

```markdown
- En el quiz, cada opción de una pregunta de título lleva el artista debajo, para que dos
  canciones homónimas se distingan y quien reconoce la voz tenga por dónde agarrarse. En
  las preguntas de artista no aparece: sería regalar la respuesta.
```

En `PROGRESS.md`, el spec 3 del pulido posterior a v0.6.0 como hecho, con el formato de las
entradas vecinas. Anota que las preguntas anteriores a la migración tienen `subtitle` nulo
y se siguen abriendo igual.

- [ ] **Step 5: Commit**

```bash
git add e2e/quiz.spec.ts CHANGELOG.md PROGRESS.md
git commit -m "test(e2e): el artista se ve en el quiz y la solución sigue oculta"
```

---

## Fuera de alcance (del spec, explícito)

- Filtrar los distractores por artista: cambiaría la dificultad.
- Reescribir las preguntas ya persistidas: se quedan con `subtitle` nulo.
