# Progreso

- **Estado**: épica **Gramola** en curso. La base publicada sigue siendo `v0.5.2`.
- **Épica actual**: `epic/gramola-platform` — convertir el bingo musical en una
  plataforma de juegos musicales.
- **Rama actual**: `epic/gramola-platform`.
- **Fase**: 12 de 12 terminadas. **Los cinco modos del catálogo son jugables**:
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
| 10   | Regresión                                  | Terminada |
| 11   | Calidad                                    | Terminada |
| 12   | Release                                    | Terminada |

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

### E2E: la suite entera pasa por primera vez

`pnpm test:e2e`: **48/48 en verde** (14,7 min), incluidas las cinco suites de
modos nuevas. Es la primera vez que la suite completa termina sin fallos: en
`v0.5.2` tampoco lo hacía.

El fallo intermitente que se arrastraba desde antes de la épica **no era
aleatorio ni era del código de producción**. La primera hipótesis —agotar el
_rate limiting_— se comprobó y resultó falsa: una ejecución completa no produjo
ni un solo 429. La causa real estaba en el helper de sesión compartida de los
E2E, que daba por válida una sesión ya revocada porque solo miraba la URL y un
enlace estático que se renderiza antes de resolver la sesión. Detalle en
`DECISIONS.md`.

### Histórico del problema (antes del arreglo)

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

`docker compose config` valida y **`docker compose --profile full build` pasa**
(`bingo-web` 1,33 GB, `bingo-api` 892 MB). No pasaba: ni en esta rama ni en
`main`. Faltaba un `.dockerignore` y el esquema de Prisma antes de instalar;
detalle en `DECISIONS.md`.

**Queda por comprobar**: GitHub Actions sobre `main` tras la integración.

## Compatibilidad verificada

- La migración es aditiva: un `CREATE TYPE` y un `ALTER TABLE ADD COLUMN`.
- Comprobado contra la base de datos de desarrollo con datos: 176/176 partidas
  quedan como `MUSIC_BINGO` y los 26 resultados y 24 usuarios se conservan.
- `modeConfig` nulo se lee como la configuración por defecto del modo, así que
  el historial anterior abre sin reescribir ninguna fila.

## Pendiente de la épica

La épica está completa. Publicada como `v0.6.0`.

Regresión comprobada sobre la base de datos real: 366 partidas con los cinco
modos en uso, 52 resultados históricos, 28 usuarios, 11 colecciones y las 6
temáticas intactas. `docker compose config` válido y los volúmenes
`bingo-musical_bingo-pgdata` y `bingo-musical_bingo-redisdata` sin tocar.

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

## Pulido posterior a v0.6.0

Ronda de specs sobre observaciones de uso de la release `v0.6.0`, cada una en
su propia rama:

- [x] Spec 2 — Salida de partida (`feat/salida-de-partida`): el botón de salir
      de una partida terminada lleva a quien tiene cuenta a `/dashboard` y al
      invitado a `/`, con la etiqueta acorde («Volver a mis partidas» / «Salir»)
      para que no se confunda con cerrar sesión.

## Errores conocidos (heredados de v0.5.2)

- Al reiniciar la API con una partida en curso, la sala pierde el runtime en
  memoria y hay que crear otra sala; el historial anterior se conserva.
- El aviso de instalación de la PWA solo aparece en navegadores Chromium; en
  iOS hay que usar «Añadir a pantalla de inicio».

## Pulido posterior a v0.6.0

Siete observaciones de uso sobre la release `v0.6.0`, cada una con su spec, su
rama y su ciclo. El índice de specs y las specs 1, 2, 3, 5, 6 y 7 viven en la
rama `fix/config-por-modo`, pendiente de fusionar; solo la spec 4 (este copy)
ha llegado ya a esta rama. No son una épica: no comparten código ni dependen unas
de otras salvo donde se indica.

| #   | Spec                                  | Estado    |
| --- | ------------------------------------- | --------- |
| 1   | Configuración específica de cada modo | Pendiente |
| 2   | Salida de partida                     | Pendiente |
| 3   | Artista en las opciones del quiz      | Pendiente |
| 4   | Copy de la portada                    | Hecha     |
| 5   | Tema claro y oscuro                   | Pendiente |
| 6   | Portadas en el cartón                 | Pendiente |
| 7   | Auditoría responsive                  | Pendiente |

### Spec 4 — Copy de la portada (`feat/copy-de-la-landing`)

- La portada cuenta qué es Gramola, qué hace falta para empezar y qué se juega,
  en vez de describir cómo se validan las jugadas del bingo.
- Los tres créditos pasan a ser los tres pasos de montar una partida: «Tu
  música», «Su móvil» y «Vuestro juego».
- Rótulo, botones e ilustración de la portada no se tocan.
- `e2e/portada.spec.ts` comprueba el contenido y que a 360 px no hay scroll
  horizontal.

## Próximo paso

Fase 6: adivina la canción. Reutiliza `PlayerAnswer` (que ya tiene `freeText` e
`attempt`) y necesita la pieza que falta: normalización y comparación difusa en
`@bingo/shared`, con umbrales que dependan de la longitud. El riesgo aquí no es
filtrar la respuesta sino un _fuzzy_ demasiado permisivo que acepte «Sal» por
«Sol».
