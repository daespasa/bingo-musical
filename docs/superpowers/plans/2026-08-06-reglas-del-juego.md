# Reglas del juego — plan de implementación

> **Para quien ejecute esto:** los pasos usan casillas (`- [ ]`) para ir marcando.

**Objetivo:** que fallar una casilla deje de inutilizarla el resto de la partida.

**Enfoque:** el fallo deja de escribirse en `bingoCardCell` y vive solo en
`PlayerMark`, que ya es por ronda. Una celda solo cambia de estado al acertar.
El navegador borra los fallos al empezar la ronda siguiente.

**Tecnologías:** NestJS + Prisma en el servidor, Next.js + Socket.IO en la web,
Playwright para las pruebas.

## Restricciones globales

- Sin migración de base de datos: el enum `CellStatus` conserva `INVALID` para
  el histórico ya guardado.
- Las pruebas no dependen de Internet ni de credenciales de Spotify.
- Commits atómicos con Conventional Commits, en la rama `epic/game-rules`.
- Nada de `docker compose down -v`.
- Los textos que ve la persona van en español y sin jerga técnica.

Spec: `docs/superpowers/specs/2026-08-06-reglas-del-juego-design.md`

---

### Tarea 1: El fallo deja de ser permanente

**Ficheros:**

- Crear: `e2e/game-rules.spec.ts`
- Modificar: `apps/api/src/realtime/game-engine.service.ts` (transacción de `markCell`, ~línea 654)
- Modificar: `apps/web/src/hooks/use-room.ts` (manejador de `round:prepare`, ~línea 88)

**Interfaces:**

- Consume: los ayudantes ya existentes de `e2e/helpers.ts` — `loginAsHost`,
  `createGameAndOpenRoom`, `joinAsPlayer`, `enableAudio`,
  `waitForRoundAcceptingMarks`.
- Produce: nada que consuman otras tareas.

- [ ] **Paso 1: Escribir la prueba que falla**

Crear `e2e/game-rules.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import {
  createGameAndOpenRoom,
  enableAudio,
  joinAsPlayer,
  loginAsHost,
  waitForRoundAcceptingMarks,
} from './helpers';

test.describe('Reglas del marcado', () => {
  test('una casilla fallada vuelve a estar disponible en la ronda siguiente', async ({
    browser,
    page,
  }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, {
      name: 'E2E reglas',
      snippetSeconds: '10',
    });

    const marta = await joinAsPlayer(browser, code, 'Marta');
    await enableAudio(marta.page);
    await page.getByRole('button', { name: 'Empezar partida' }).click();
    await waitForRoundAcceptingMarks(marta.page);

    // Solo una casilla puede ser la canción de la ronda, así que tocando dos
    // distintas se garantiza al menos un fallo sin saber cuál suena.
    const cells = marta.page.getByRole('gridcell');
    let failedTitle: string | null = null;
    for (let i = 0; i < 2; i++) {
      const cell = cells.nth(i);
      const title = (await cell.innerText()).split('\n')[0] ?? '';
      await cell.click();
      const label = await cell.getAttribute('aria-label');
      if (label?.includes('(fallada)')) {
        failedTitle = title;
        break;
      }
    }
    expect(failedTitle, 'ninguna de las dos casillas resultó fallada').not.toBeNull();

    const failedCell = marta.page.getByRole('gridcell', {
      name: new RegExp(failedTitle!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    });
    await expect(failedCell).toBeDisabled();

    // La ronda siguiente devuelve esa casilla al juego
    await expect(marta.page.getByText(/Ronda 2 de/)).toBeVisible({ timeout: 60_000 });
    await waitForRoundAcceptingMarks(marta.page);
    await expect(failedCell).toBeEnabled();
    await expect(failedCell).not.toHaveAttribute('aria-label', /\(fallada\)/);

    await marta.context.close();
  });
});
```

- [ ] **Paso 2: Ejecutarla y ver que falla**

```bash
CI=1 pnpm exec playwright test e2e/game-rules.spec.ts --reporter=list
```

Esperado: FALLA en `await expect(failedCell).toBeEnabled()`, porque hoy la
casilla queda deshabilitada para siempre.

- [ ] **Paso 3: Que el servidor no persista el fallo**

En `apps/api/src/realtime/game-engine.service.ts`, dentro de la transacción de
`markCell`, la actualización de la celda pasa a ser condicional:

```ts
await this.prisma.$transaction(async (tx) => {
  await tx.playerMark.create({
    data: {
      roundId: r.roundId,
      participantId,
      cellId,
      isCorrect,
      latencyMs,
    },
  });
  // El fallo no se guarda en la casilla: es un suceso de esta ronda y vive
  // en `playerMark`, cuya clave única (roundId, cellId) ya evita que se
  // penalice dos veces. Si se escribiera aquí, la casilla quedaría
  // bloqueada el resto de la partida y esa canción ya no podría marcarse.
  if (isCorrect) {
    await tx.bingoCardCell.update({
      where: { id: cellId },
      data: {
        status: 'VALID',
        markedAt: new Date(),
        validatedAt: new Date(),
      },
    });
  }
  for (const e of events) {
    await tx.scoreEvent.create({
      data: {
        roomId,
        participantId,
        roundId: r.roundId,
        type: e.type as never,
        points: e.points,
      },
    });
  }
});
```

- [ ] **Paso 4: Que el navegador limpie los fallos al cambiar de ronda**

En `apps/web/src/hooks/use-room.ts`, el manejador de `round:prepare` devuelve al
cartón las casillas falladas:

```ts
socket.on(
  'round:prepare',
  p<RoundPreparePayload>((d) => {
    setPrepare(d);
    setRevealed(null);
    setSchedule(null);
    setLastClaim(null);
    setAwaitingReveal(false);
    // Los fallos son de la ronda que acaba: esas canciones siguen vivas y
    // deben poder marcarse cuando les toque sonar.
    setState((prev) =>
      prev?.card
        ? {
            ...prev,
            card: {
              ...prev.card,
              cells: prev.card.cells.map((c) =>
                c.status === 'INVALID' ? { ...c, status: 'UNMARKED' } : c,
              ),
            },
          }
        : prev,
    );
  }),
);
```

- [ ] **Paso 5: Ejecutar la prueba y verla pasar**

```bash
CI=1 pnpm exec playwright test e2e/game-rules.spec.ts --reporter=list
```

Esperado: PASA.

- [ ] **Paso 6: Comprobar que no se ha roto nada**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
CI=1 pnpm test:e2e
```

Esperado: todo en verde, 13 pruebas E2E.

- [ ] **Paso 7: Commit**

```bash
git add apps/api/src/realtime/game-engine.service.ts apps/web/src/hooks/use-room.ts e2e/game-rules.spec.ts
git commit -m "fix(gameplay): let a wrong mark be retried in a later round"
```

---

### Tarea 2: El acierto sigue siendo definitivo

Protege el cambio anterior por el otro lado: al limpiar los fallos no se puede
estar limpiando también los aciertos.

**Ficheros:**

- Modificar: `e2e/game-rules.spec.ts`

- [ ] **Paso 1: Añadir la prueba**

Dentro del mismo `test.describe`:

```ts
test('un acierto no se borra al cambiar de ronda', async ({ browser, page }) => {
  await loginAsHost(page);
  const code = await createGameAndOpenRoom(page, {
    name: 'E2E acierto',
    snippetSeconds: '10',
  });

  const marta = await joinAsPlayer(browser, code, 'Marta');
  await enableAudio(marta.page);
  await page.getByRole('button', { name: 'Empezar partida' }).click();

  // Se toca todo el cartón hasta acertar: solo una casilla es la de la ronda
  let hitTitle: string | null = null;
  for (let round = 1; round <= 3 && !hitTitle; round++) {
    await waitForRoundAcceptingMarks(marta.page);
    const cells = marta.page.getByRole('gridcell');
    const total = await cells.count();
    for (let i = 0; i < total; i++) {
      const cell = cells.nth(i);
      if (!(await cell.isEnabled())) continue;
      const title = (await cell.innerText()).split('\n')[0] ?? '';
      await cell.click();
      if ((await cell.getAttribute('aria-label'))?.includes('(acertada)')) {
        hitTitle = title;
        break;
      }
    }
    if (!hitTitle) {
      await expect(marta.page.getByText(new RegExp(`Ronda ${round + 1} de`))).toBeVisible({
        timeout: 60_000,
      });
    }
  }
  expect(hitTitle, 'no se acertó ninguna casilla en tres rondas').not.toBeNull();

  const hitCell = marta.page.getByRole('gridcell', {
    name: new RegExp(hitTitle!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  });
  await expect(hitCell).toHaveAttribute('aria-label', /\(acertada\)/);

  // Pasa la ronda y el acierto sigue ahí
  await expect(marta.page.getByText(/Ronda \d+ de/)).toBeVisible();
  await marta.page.waitForTimeout(20_000);
  await expect(hitCell).toHaveAttribute('aria-label', /\(acertada\)/);
  await expect(hitCell).toBeDisabled();

  await marta.context.close();
});
```

- [ ] **Paso 2: Ejecutarla**

```bash
CI=1 pnpm exec playwright test e2e/game-rules.spec.ts --reporter=list
```

Esperado: PASAN las dos pruebas.

- [ ] **Paso 3: Commit**

```bash
git add e2e/game-rules.spec.ts
git commit -m "test(gameplay): guard that a correct mark survives the round change"
```

---

### Tarea 3: Partida real y pulido

**Ficheros:** los que haga falta según lo que aparezca.

- [ ] **Paso 1: Levantar el entorno**

```bash
docker compose up -d bingo-postgres bingo-redis
pnpm dev
```

- [ ] **Paso 2: Jugar una partida completa**

Con dos navegadores contra la misma sala, de principio a fin: entrar por
código, activar sonido, empezar, marcar aciertos y fallos, cantar línea y
bingo, pausar y reanudar, recargar una de las pestañas a mitad de ronda,
terminar y ver el podio.

Anotar en `docs/superpowers/plans/2026-08-06-partida-real.md`, para cada
problema: qué se hizo, qué se esperaba, qué pasó y si se repite.

- [ ] **Paso 3: Ordenar lo encontrado**

Separar en dos listas: lo que se arregla en esta épica (reproducible y
acotado) y lo que se anota en `PROGRESS.md` por ser mayor que la épica.

- [ ] **Paso 4: Arreglar, cada cosa con su commit**

Para cada problema reproducible: prueba que falla si es automatizable,
arreglo, prueba en verde, commit.

- [ ] **Paso 5: Cerrar la épica**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
CI=1 pnpm test:e2e
```

Actualizar `CHANGELOG.md`, `PROGRESS.md` y la versión, integrar en `main` con
`--no-ff` y comprobar que CI y E2E quedan en verde.
