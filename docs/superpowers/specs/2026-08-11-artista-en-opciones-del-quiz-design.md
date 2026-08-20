# Artista en las opciones del quiz

**Fecha**: 2026-08-11
**Estado**: aprobado, pendiente de plan
**Ámbito**: `apps/api` (constructor de preguntas), `packages/database`, `apps/web`

## Problema

En la pregunta «¿Cómo se llama esta canción?» las cuatro opciones son títulos
sueltos. Sin el artista, dos problemas reales: los títulos repetidos entre
artistas son indistinguibles, y quien reconoce la voz pero no el título no
tiene por dónde agarrarse.

Hoy la opción es texto plano: `QuizQuestionDraft.options` es `string[]`
(`question-builder.ts:21`) y `AnswerOption` guarda un único campo `text`
(`schema.prisma:536`).

## Decisión

Cada opción de una pregunta **de tipo `SONG_TITLE`** se muestra como el título
en primera línea y el artista debajo, en menor tamaño.

**Solo en `SONG_TITLE`.** En una pregunta de tipo `ARTIST` el artista _es_ la
respuesta, y enseñarlo bajo cada opción la regalaría. Esta restricción es la
parte que más fácil se rompe al implementar, así que va escrita en un test.

Se descartó concatenar todo en `text` («Flowers — Miley Cyrus»): ensucia el
dato persistido, complica cualquier comparación futura y deja el artista con el
mismo peso tipográfico que el título, que es justo lo que no queremos.

## Cambios

### 1. Esquema: subtítulo de la opción

Migración aditiva sobre `AnswerOption`:

```prisma
/// Línea secundaria de la opción. Hoy el artista en las preguntas de título;
/// nulo cuando el tipo de pregunta no lo admite.
subtitle String?
```

Se persiste en lugar de derivarse en cada emisión porque quien reconecta a
mitad de ronda tiene que ver exactamente las mismas opciones que los demás,
y esa garantía ya se apoya en lo persistido.

### 2. Constructor de preguntas

`QuizQuestionDraft.options` pasa de `string[]` a
`Array<{ text: string; subtitle: string | null }>`.

Los distractores ya salen de otras pistas de la colección, así que el artista
de cada uno está disponible en `RoundTrack` sin consultas nuevas. El
constructor rellena `subtitle` solo cuando `type === 'SONG_TITLE'`; en el resto
de tipos va `null`.

La siembra aleatoria no cambia: el subtítulo viaja pegado a su opción, así que
barajar sigue funcionando igual y una misma ronda sigue produciendo el mismo
orden.

### 3. Emisión y contrato

El payload público de la ronda (`multiple-choice.handler.ts:138`) lleva
`subtitle` junto a cada opción. Sigue sin viajar nada que delate la solución:
el subtítulo existe para las cuatro opciones o para ninguna.

### 4. Interfaz

En jugador y proyector, la opción pasa a dos líneas: título en el peso actual,
artista debajo en `text-sm` y color secundario. Cuando `subtitle` es nulo el
botón se renderiza exactamente como hoy, sin hueco reservado.

El botón ya cumple el mínimo de 44 px de alto; con dos líneas crece, lo que
mejora el objetivo táctil. Hay que revisar que cuatro opciones a dos líneas
sigan cabiendo sin scroll en un móvil de 360×640 con el reproductor visible.

## Pruebas

- Constructor, `SONG_TITLE`: las cuatro opciones traen `subtitle` con el
  artista correspondiente a cada título, no el de la pista sonando.
- Constructor, `ARTIST` y `DECADE`: todas las opciones traen `subtitle: null`.
- Determinismo: dos construcciones con la misma semilla dan el mismo orden y
  los mismos pares título/artista.
- E2E de quiz: la pantalla del jugador muestra los cuatro artistas y la
  solución sigue sin aparecer antes del reveal.

## Riesgos

- Colecciones con muchas pistas del mismo artista: cuatro opciones con el mismo
  subtítulo no aportan nada, pero tampoco estorban. No se filtra por artista al
  elegir distractores; hacerlo cambiaría la dificultad, que es otra discusión.
- Preguntas ya persistidas tendrán `subtitle` nulo. El historial debe seguir
  abriéndolas sin reescribir nada.
