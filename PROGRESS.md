# Progreso

- **Estado**: épica **Gramola** en curso. La base publicada sigue siendo `v0.5.2`.
- **Épica actual**: `epic/gramola-platform` — convertir el bingo musical en una
  plataforma de juegos musicales.
- **Rama actual**: `epic/gramola-platform`.
- **Fase**: 2 de 12 terminadas (marca y dominio genérico).

## Épica Gramola: estado por fases

| Fase | Contenido                                  | Estado    |
| ---- | ------------------------------------------ | --------- |
| 0    | Baseline y auditoría                       | Terminada |
| 1    | Marca Gramola                              | Terminada |
| 2    | Dominio genérico de modos                  | Terminada |
| 3    | Selector de modo y wizard                  | Pendiente |
| 4    | Bingo clásico (revelado desde el inicio)   | Pendiente |
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

## Validaciones ejecutadas en esta épica

Ejecutadas el 2026-08-07 sobre `refactor/game-mode-domain`:

| Comprobación     | Resultado                                                        |
| ---------------- | ---------------------------------------------------------------- |
| `pnpm lint`      | 8/8 paquetes sin errores                                         |
| `pnpm typecheck` | 8/8 paquetes sin errores                                         |
| `pnpm test`      | 134 tests en 13 archivos (shared 59, music-providers 24, api 51) |
| `pnpm build`     | 5/5 paquetes compilados                                          |
| Migración        | Aplicada sobre la base de datos con datos reales                 |

Baseline de partida (`v0.5.2`, mismo día): lint y typecheck en verde, 94 tests.

**No ejecutados todavía en esta épica**: `pnpm test:e2e`, `docker compose
--profile full build` y GitHub Actions. Las cifras de E2E de `v0.5.2` (25 tests)
no se han vuelto a comprobar y no deben darse por vigentes.

## Compatibilidad verificada

- La migración es aditiva: un `CREATE TYPE` y un `ALTER TABLE ADD COLUMN`.
- Comprobado contra la base de datos de desarrollo con datos: 176/176 partidas
  quedan como `MUSIC_BINGO` y los 26 resultados y 24 usuarios se conservan.
- `modeConfig` nulo se lee como la configuración por defecto del modo, así que
  el historial anterior abre sin reescribir ninguna fila.

## Pendiente de la épica

Las fases 3 a 12 siguen sin empezar. En concreto, **no existen todavía**:
selector de modo en el wizard, bingo clásico de principio a fin, quiz musical,
adivina la canción, supervivencia, modo mixto, adaptación de The Show y de la
ceremonia por modo, ni los E2E nuevos.

El catálogo marca esos modos como `PROXIMAMENTE` y el registro se niega a
resolver un handler que no existe, de forma que ninguno puede iniciarse por
error desde la interfaz ni desde la API.

## Errores conocidos (heredados de v0.5.2)

- Al reiniciar la API con una partida en curso, la sala pierde el runtime en
  memoria y hay que crear otra sala; el historial anterior se conserva.
- El aviso de instalación de la PWA solo aparece en navegadores Chromium; en
  iOS hay que usar «Añadir a pantalla de inicio».

## Próximo paso

Fase 3: selector de modo en `/dashboard/games/new`, alimentado por el catálogo
de `@bingo/shared`, con las tarjetas de los modos no implementados en estado
`Próximamente` y no seleccionables. A continuación, fase 4 (bingo clásico), que
ya tiene dominio y handler y solo necesita recorrido de interfaz.
