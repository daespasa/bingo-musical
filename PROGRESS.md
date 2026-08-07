# Progreso

- **Estado**: épica **Gramola** en curso. La base publicada sigue siendo `v0.5.2`.
- **Épica actual**: `epic/gramola-platform` — convertir el bingo musical en una
  plataforma de juegos musicales.
- **Rama actual**: `epic/gramola-platform`.
- **Fase**: 4 de 12 terminadas (marca, dominio, selector y bingo clásico).

## Épica Gramola: estado por fases

| Fase | Contenido                                  | Estado    |
| ---- | ------------------------------------------ | --------- |
| 0    | Baseline y auditoría                       | Terminada |
| 1    | Marca Gramola                              | Terminada |
| 2    | Dominio genérico de modos                  | Terminada |
| 3    | Selector de modo y wizard                  | Terminada |
| 4    | Bingo clásico (revelado desde el inicio)   | Terminada |
| 5    | Quiz musical                               | Pendiente |
| 6    | Adivina la canción                         | Pendiente |
| 7    | Supervivencia                              | Pendiente |
| 8    | Modo mixto                                 | Pendiente |
| 9    | Experiencia transversal (Show, resultados) | Pendiente |
| 10   | Regresión                                  | Pendiente |
| 11   | Calidad                                    | Pendiente |
| 12   | Release                                    | Pendiente |

### Fase 1 — Marca (`feat/gramola-brand`)

- `APP_BRAND` en `packages/shared/src/brand.ts` como única fuente del nombre.
- Metadata, manifest PWA, aviso de instalación, cabeceras, portada y Swagger
  consumen la constante.
- Portada con el reclamo «Tu música. Vuestro juego.» y los CTA nuevos.
- Test que impide que «Bingo Musical» reaparezca en el código de las apps,
  distinguiendo el producto (ya no existe) del modo de juego (sigue existiendo).
- Identificadores técnicos heredados conservados a propósito; razonado en
  `DECISIONS.md`.

### Fase 2 — Dominio genérico (`refactor/game-mode-domain`)

- `GameMode` en Prisma y catálogo de modos en `@bingo/shared`, con
  disponibilidad explícita: solo `MUSIC_BINGO` se anuncia como jugable.
- `GameModeHandler` + `GameModeRegistry`: cada modo encapsula validación de
  configuración, creación de ronda, evaluación, puntuación y final de partida.
  El motor de sala, audio, ranking y realtime siguen siendo comunes.
- `MusicBingoHandler` con las dos variantes (`HIDDEN_UNTIL_REVEAL` y
  `VISIBLE_FROM_START`) sobre el mismo motor.
- Configuración por modo en JSON validado con Zod discriminado, con
  `configVersion`, validada al escribir y al leer.
- Migración aditiva `20260807124839_add_game_mode_and_config`.

### Fases 3 y 4 — Selector y bingo clásico (`feat/game-mode-selector`)

- Selector «¿A qué quieres jugar?» con las cinco tarjetas: jugadores
  recomendados, dificultad, proyector, remoto y disponibilidad. Los modos sin
  handler salen como `Próximamente` y no se pueden elegir.
- Cada modo tiene figura propia además de color, para no depender de él.
- Selector de variante del bingo: «Bingo a ciegas» y «Bingo clásico».
- En clásico, título y artista viajan desde `round:prepare` y se ven en jugador,
  anfitrión y proyector; la reconexión los recupera de `room:state`.
- En clásico una marca equivocada no resta, y la regla vive en el handler.
- El motor delega evaluación y puntuación en el handler del modo.
- El historial muestra modo y variante.

## Validaciones ejecutadas en esta épica

Ejecutadas el 2026-08-07 sobre `feat/game-mode-selector`:

| Comprobación     | Resultado                                                        |
| ---------------- | ---------------------------------------------------------------- |
| `pnpm lint`      | 8/8 paquetes sin errores                                         |
| `pnpm typecheck` | 8/8 paquetes sin errores                                         |
| `pnpm test`      | 136 tests en 13 archivos (shared 59, music-providers 24, api 53) |
| `pnpm build`     | 5/5 paquetes compilados                                          |
| Migración        | Aplicada sobre la base de datos con datos reales                 |

Baseline de partida (`v0.5.2`, mismo día): lint y typecheck en verde, 94 tests.

### E2E: la suite no está en verde, y no es culpa de esta épica

`pnpm test:e2e` se ha ejecutado tres veces sobre la épica y dos sobre `main`:

| Rama                    | Resultado                                                         |
| ----------------------- | ----------------------------------------------------------------- |
| `epic/gramola-platform` | 24 pasan / 1 falla (`auth.spec.ts` «sin credenciales de Spotify») |
| `epic/gramola-platform` | 23 pasan / 2 fallan (la anterior más `game-rules.spec.ts`)        |
| `main` (v0.5.2)         | 24 pasan / 1 falla (**el mismo test** que en la épica)            |

Los dos tests aislados pasan en ambas ramas; solo fallan dentro de la suite
completa, y el conjunto que falla cambia entre ejecuciones. Es inestabilidad
preexistente, reproducida en `main` sin ningún cambio de esta épica.

Tras las fases 3 y 4 se han ejecutado por separado, sin ningún fallo:

| Suite                                              | Resultado |
| -------------------------------------------------- | --------- |
| `bingo-variants.spec.ts` (nueva)                   | 4/4       |
| `gameplay` + `game-rules` + `the-show` (regresión) | 8/8       |

La suite completa sigue sin ejecutarse entera en verde por el problema de
arriba, anterior a esta épica.

Por tanto: **la afirmación de `v0.5.2` de «25 E2E en verde» no se reproduce en
este entorno** y no debe arrastrarse. Queda como problema conocido a investigar
antes de la release: los tests comparten una sola sesión desde `c185a1e` y
dependen de temporización real de audio, que son los dos sospechosos.

**No ejecutados todavía en esta épica**: `docker compose --profile full build` y
GitHub Actions.

## Compatibilidad verificada

- La migración es aditiva: un `CREATE TYPE` y un `ALTER TABLE ADD COLUMN`.
- Comprobado contra la base de datos de desarrollo con datos: 176/176 partidas
  quedan como `MUSIC_BINGO` y los 26 resultados y 24 usuarios se conservan.
- `modeConfig` nulo se lee como la configuración por defecto del modo, así que
  el historial anterior abre sin reescribir ninguna fila.

## Pendiente de la épica

Las fases 5 a 12 siguen sin empezar. En concreto, **no existen todavía**: quiz
musical, adivina la canción, supervivencia, modo mixto, adaptación de The Show
y de la ceremonia a cada modo, ni la revancha.

El catálogo marca esos modos como `PROXIMAMENTE` y el registro se niega a
resolver un handler que no existe, de forma que ninguno puede iniciarse por
error desde la interfaz ni desde la API.

## Errores conocidos (heredados de v0.5.2)

- Al reiniciar la API con una partida en curso, la sala pierde el runtime en
  memoria y hay que crear otra sala; el historial anterior se conserva.
- El aviso de instalación de la PWA solo aparece en navegadores Chromium; en
  iOS hay que usar «Añadir a pantalla de inicio».

## Próximo paso

Fase 5: quiz musical. Es el primer modo que necesita entidades nuevas
(`RoundQuestion`, `AnswerOption`, `PlayerAnswer`) y el primero donde la
seguridad manda: la respuesta correcta no puede viajar al cliente antes del
reveal, ni por payload, ni por props, ni por caché de React Query.
