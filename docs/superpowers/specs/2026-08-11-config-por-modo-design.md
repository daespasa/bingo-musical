# Configuración específica de cada modo

**Fecha**: 2026-08-11
**Estado**: aprobado, pendiente de plan
**Ámbito**: `apps/web` (wizard, sala de espera, resumen) y el DTO de sala en `apps/api`

## Problema

`cardSize`, `freeCenter`, `lineEnabled` y `bingoEnabled` viven en `GameSettings`
desde que Gramola solo tenía bingo. La épica de plataforma movió lo específico
de cada modo a `Game.modeConfig`, pero estos cuatro campos se quedaron donde
estaban.

El motor ya los ignora fuera del bingo: `game-engine.service.ts:448` solo
reparte cartones cuando el modo es `MUSIC_BINGO`, y la vista de jugador
condiciona cartón y botones de línea/bingo a que exista `state.card`. **En
partida no hay ninguna fuga.**

La interfaz sí las tiene, en cuatro sitios:

| Sitio                              | Qué enseña de más                                     |
| ---------------------------------- | ----------------------------------------------------- |
| `dashboard/games/new/page.tsx:524` | Tarjeta «Cartón» (3×3, 4×4, 5×5) en los cinco modos   |
| `dashboard/games/new/page.tsx:629` | «Reglas»: centro libre, premio por línea, por bingo   |
| `join/[code]/page.tsx:69`          | «cartón N×N» en la sala de espera, para los jugadores |
| `dashboard/games/[id]/page.tsx:60` | «Cartón N×N» en el resumen de la partida              |

La de la sala de espera es la más visible: la lee cada jugador que entra con el
código, incluso en una partida de quiz donde no habrá ningún cartón.

## Decisión

Arreglar la interfaz y dejar los datos coherentes, **sin migración de esquema**.

Se descartó mover los cuatro campos a `musicBingoConfig`, que sería más limpio,
porque obliga a migrar, tocar motor e historial y reescribir los E2E, a cambio
de nada que el usuario perciba. Queda anotado como deuda consciente.

## Cambios

### 1. Wizard: secciones condicionadas al modo

La tarjeta «Cartón» y la sección «Reglas» se renderizan solo cuando
`mode === 'MUSIC_BINGO'`.

Se quedan visibles en todos los modos, porque son comunes de verdad: duración
del fragmento, tiempo extra de respuesta y toda la tarjeta «Ritmo de la
partida» (revelado automático, encadenar rondas, pausa de resultados).

### 2. Envío: defaults neutros fuera del bingo

Al construir el payload, si el modo no es `MUSIC_BINGO` se envían valores
neutros en vez de lo que hubiera quedado en el formulario tras cambiar de modo:

```
cardSize: 3, freeCenter: false, lineEnabled: false, bingoEnabled: false
```

Así el dato guardado no contradice a la partida jugada. `cardSize` mantiene 3
porque la columna no admite nulo y 3 es su valor por defecto en Prisma.

### 3. Contrato de sala: añadir el modo de juego

El DTO de `rooms.service.ts:19-24` expone `cardSize` pero no el modo de juego —
su campo `mode` es `PROJECTOR | REMOTE`, otra cosa. Se añade:

- `gameMode: GameMode`
- `modeSummary: string` — la línea que la sala de espera enseña en lugar del
  cartón, redactada en el servidor a partir de `modeConfig` ya validado.

Redactarlo en el servidor evita que el cliente tenga que recibir `modeConfig`
entero y volver a interpretarlo. Es aditivo: ningún consumidor actual se rompe.

Resúmenes por modo:

| Modo              | `modeSummary`                        |
| ----------------- | ------------------------------------ |
| `MUSIC_BINGO`     | `cartón 3×3` (lo de ahora)           |
| `MULTIPLE_CHOICE` | `4 opciones por pregunta`            |
| `FREE_TEXT`       | `2 intentos` / `intentos ilimitados` |
| `SURVIVAL`        | `3 vidas`                            |
| `MIXED`           | `mezcla equilibrada`                 |

### 4. Resumen de partida

`dashboard/games/[id]/page.tsx:60` usa el mismo criterio: «Cartón N×N» solo en
bingo, y en los demás modos el dato equivalente. Esta pantalla ya recibe
`game.modeConfig`, así que no necesita contrato nuevo.

## Qué no se toca

- El esquema de Prisma y las migraciones.
- El motor de partida, que ya se comporta bien.
- Las partidas ya guardadas: siguen abriendo igual, con su `cardSize` histórico.

## Pruebas

- Unitaria del redactor de `modeSummary`: un caso por modo, más `modeConfig`
  nulo, que debe caer en el resumen por defecto del modo sin lanzar.
- E2E del wizard, un caso por modo no-bingo: no aparecen «Cartón», «Centro
  libre», «Premio por línea» ni «Premio por bingo»; en bingo sí aparecen los
  cuatro.
- E2E de la sala de espera en quiz: el texto no menciona «cartón».

## Riesgos

- El wizard es un formulario único de 662 líneas con `react-hook-form`: ocultar
  campos registrados no los desregistra, de ahí que el paso 2 fuerce los
  neutros en el envío en lugar de confiar en el estado del formulario.
- `modeSummary` se redacta a partir de `modeConfig`, que en partidas anteriores
  a la épica es nulo. El redactor debe tratar el nulo como la configuración por
  defecto del modo, igual que ya hace el historial.
