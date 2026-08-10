# Progreso

- **Estado**: épica **Gramola** en curso. La base publicada sigue siendo `v0.5.2`.
- **Épica actual**: `epic/gramola-platform` — convertir el bingo musical en una
  plataforma de juegos musicales.
- **Rama actual**: `epic/gramola-platform`.
- **Fase**: 9 de 12 terminadas. **Los cinco modos del catálogo son jugables**:
  bingo (dos variantes), quiz, adivina, supervivencia y mixto, cada uno con su
  resumen entre rondas y su ceremonia.

## Épica Gramola: estado por fases

| Fase | Contenido                                  | Estado    |
| ---- | ------------------------------------------ | --------- |
| 0    | Baseline y auditoría                       | Terminada |
| 1    | Marca Gramola                              | Terminada |
| 2    | Dominio genérico de modos                  | Terminada |
| 3    | Selector de modo y wizard                  | Terminada |
| 4    | Bingo clásico (revelado desde el inicio)   | Terminada |
| 5    | Quiz musical                               | Terminada |
| 6    | Adivina la canción                         | Terminada |
| 7    | Supervivencia                              | Terminada |
| 8    | Modo mixto                                 | Terminada |
| 9    | Experiencia transversal (Show, resultados) | Terminada |
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

### Fase 5 — Quiz musical (`feat/music-quiz`)

- `MultipleChoiceHandler` registrado: el quiz ya es un modo `DISPONIBLE`.
- El servidor redacta la pregunta, construye las opciones con distractores de
  la propia colección y persiste `RoundQuestion` + `AnswerOption` antes de
  emitir nada.
- Tipos de pregunta: título, artista y década. Año y álbum quedan en el dominio
  pero no se ofrecen: dependen de metadatos que no toda colección trae.
- La solución no viaja antes del reveal, ni por payload, ni por el ack de
  respuesta, ni por el marcador (que se mueve al cerrar la ronda).
- Distribución de respuestas y highlights propios: único acierto, acertaron
  todos, no acertó nadie y distractor más votado.
- Reconexión: la pregunta y la respuesta ya enviada se recuperan de
  `room:state`.
- Las 20 pistas demo reciben año, repartidas en cinco décadas.
- Migración aditiva `20260808...add_quiz_questions_and_release_year`.

### Fase 6 — Adivina la canción (`feat/free-text-guess`)

- `FreeTextHandler` registrado: el modo ya es `DISPONIBLE`.
- `answer-matching.ts` en `@bingo/shared`, aparte de `normalizeText` para no
  tocar las claves normalizadas ya persistidas.
- Normalización: mayúsculas, acentos, puntuación, apóstrofes, guiones,
  `&`/`and`/`y` y sufijos técnicos (remaster, radio edit, live, deluxe…), solo
  al final o entre paréntesis.
- Fuzzy Damerau-Levenshtein con tolerancia por longitud: 0 hasta cinco letras,
  1 hasta ocho, 2 hasta doce, 3 por encima, más un 80 % de parecido mínimo.
- Política de colaboraciones: vale el artista principal, no un invitado suelto.
- Intentos configurables (1, 2, 3 o ilimitados), enfriamiento de 900 ms por
  jugador y rechazo de respuestas repetidas.
- Ni el ack ni el marcador delatan el acierto; la puntuación se aplica al
  cerrar la ronda.
- Al revelar se cuenta cuántos acertaron y por qué camino (exacta, alias,
  normalizada o errata). Las respuestas equivocadas no se enseñan en público.

### Fase 7 — Supervivencia (`feat/survival-mode`)

- `SurvivalHandler` registrado: el modo ya es `DISPONIBLE`.
- No duplica evaluadores: el motor deriva la configuración del quiz o de la
  respuesta libre, y toda la maquinaria existente se reutiliza.
- `survival-rules.ts`: lógica pura de vidas, eliminación, clasificación y final
  de partida, con 24 tests.
- `PlayerLifeState` persistido: recargar no devuelve vidas ni resucita a nadie.
- Quien está eliminado ve la partida entera pero el servidor le rechaza
  cualquier respuesta; el botón tampoco se le ofrece.
- Vidas en texto además de corazones, en una región viva que las anuncia al
  perderlas.
- Desempate determinista: en pie > rondas aguantadas > vidas > puntos >
  aciertos > menor tiempo.
- Highlights propios: primera eliminación, caída múltiple, último
  superviviente y aguantar con una vida.
- Migración aditiva `20260808...add_player_life_state`.

### Fase 8 — Modo mixto (`feat/mixed-mode`)

- `MixedHandler` registrado: ya no queda ningún modo como `PROXIMAMENTE`.
- Reparto calculado una vez por partida, por resto mayor, para que ningún tipo
  con peso desaparezca en partidas cortas.
- Intercalado proporcional: la variedad aparece en las primeras rondas, no a
  mitad de partida.
- Dos presets: equilibrado y solo reconocimiento. El dominio admite reparto
  personalizado, aunque el wizard aún no lo edita.
- El bingo queda fuera de la mezcla y se dice en la interfaz.

### Fase 9 — Experiencia transversal (`feat/mode-aware-show`)

- El resumen entre rondas cuenta la ronda con las palabras del modo, sin
  duplicar el componente: bingo «la tenían», el resto «la acertaron»,
  supervivencia añade caídas y supervivientes, adivina añade cuántas colaron
  por errata.
- Corregido un fallo real: los aciertos se contaban siempre con marcas de
  cartón, así que en todos los modos nuevos el resumen decía «no la tenía
  nadie». `totalPlayers` pasa además a contar jugadores, no participantes.
- La ceremonia añade el orden de caída en supervivencia y renombra la
  clasificación cuando el modo lo pide.
- **Revancha**: duplica la partida y abre una sala nueva, para no sobrescribir
  el historial de la que acaba de terminar. Solo el anfitrión.

## Validaciones ejecutadas en esta épica

Ejecutadas el 2026-08-08 sobre `feat/mode-aware-show`:

| Comprobación     | Resultado                                          |
| ---------------- | -------------------------------------------------- |
| `pnpm lint`      | 8/8 paquetes sin errores                           |
| `pnpm typecheck` | 8/8 paquetes sin errores                           |
| `pnpm test`      | 251 tests (shared 94, music-providers 24, api 133) |
| `pnpm build`     | 5/5 paquetes compilados                            |
| `pnpm build`     | 5/5 paquetes compilados                            |
| Migración        | Aplicada sobre la base de datos con datos reales   |

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
| `the-show-modes.spec.ts` (nueva)                   | 4/4       |
| `mixed.spec.ts`                                    | 3/3       |
| `survival.spec.ts`                                 | 4/4       |
| `guess.spec.ts`                                    | 4/4       |
| `quiz.spec.ts`                                     | 4/4       |
| `bingo-variants.spec.ts`                           | 4/4       |
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

Quedan las fases 10 a 12: regresión completa, calidad y release.

Pendientes menores conocidos:

- El reparto **personalizado** del modo mixto existe en el dominio pero el
  wizard solo ofrece los dos presets.
- El panel del presentador (§26) no muestra información privada al anfitrión
  —siguiente canción, respuesta correcta, quién ha respondido—; los controles
  sí están todos.
- El runtime de partida sigue viviendo en memoria: reiniciar la API con una
  sala en curso la pierde. Es deuda heredada de v0.5.2, no de esta épica.

Ya no queda ningún modo del catálogo sin implementar. El registro sigue
negándose a resolver un handler inexistente, que es lo que protegerá a los
modos futuros de anunciarse antes de tiempo.

## Errores conocidos (heredados de v0.5.2)

- Al reiniciar la API con una partida en curso, la sala pierde el runtime en
  memoria y hay que crear otra sala; el historial anterior se conserva.
- El aviso de instalación de la PWA solo aparece en navegadores Chromium; en
  iOS hay que usar «Añadir a pantalla de inicio».

## Próximo paso

Fase 6: adivina la canción. Reutiliza `PlayerAnswer` (que ya tiene `freeText` e
`attempt`) y necesita la pieza que falta: normalización y comparación difusa en
`@bingo/shared`, con umbrales que dependan de la longitud. El riesgo aquí no es
filtrar la respuesta sino un _fuzzy_ demasiado permisivo que acepte «Sal» por
«Sol».
