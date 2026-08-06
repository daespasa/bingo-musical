# Épica 1 — Reglas del juego

Fecha: 2026-08-06 · Estado: aprobado, pendiente de plan de implementación

## Contexto: las cuatro épicas

Quince peticiones se reparten en cuatro épicas que se validan y publican por
separado. Esta es la primera porque es la única que rompe partidas hoy, y
porque el pulido de una partida real no tiene sentido antes de arreglar las
reglas.

| Orden | Épica                 | Contenido                                                                                                     |
| ----- | --------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1     | Reglas del juego      | Fallo recuperable y pulido de una partida real                                                                |
| 2     | Colecciones y Spotify | Importar listas enteras, gestionar colecciones, crear listas canción a canción, colecciones temáticas propias |
| 3     | El espectáculo        | Highlights entre rondas, más estadísticas, reacciones en el proyector, animaciones musicales                  |
| 4     | Producto y cuenta     | Textos orientados a la persona, header rediseñado, editar perfil, dashboard inicial, sesión                   |

Dos decisiones ya tomadas sobre la épica 2, para no volver sobre ellas:

- **No se conectan cuentas de Spotify.** La idea era recomendar sobre las listas
  propias de cada persona, y no compensa el coste: OAuth por usuario, tokens
  cifrados y refresco. Se mantienen las credenciales de aplicación, que bastan
  para buscar e importar listas públicas.
- **Las colecciones temáticas son nuestras.** Un script las construye buscando
  en Spotify por año y género, y se pueden regenerar y ampliar con el tiempo.
  Spotify ya no da `preview_url` a las aplicaciones nuevas, así que el script
  debe descartar las canciones cuya preview no resuelva el `PreviewProvider` e
  informar de la cobertura obtenida: una colección temática solo sirve si suena.

## El problema

Dos defectos en `apps/api/src/realtime/game-engine.service.ts`:

1. **La casilla fallada queda inutilizada para siempre.** Al fallar se escribe
   `status: 'INVALID'` en `bingoCardCell` (línea 667), y la guarda de entrada
   rechaza cualquier casilla que no esté `UNMARKED` (línea 609). Si alguien
   toca una casilla antes de que suene esa canción, ya no podrá marcarla cuando
   suene de verdad. Es el fallo que se sufre jugando.

2. **El fallo se muestra como estado permanente.** La interfaz tacha la casilla
   y así se queda, cuando en realidad esa canción sigue viva en la partida.

## Las reglas

| Caso                                         | Resultado                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| Marco la canción de la ronda en curso        | Acierto permanente: +100, más bonus de velocidad y de racha            |
| Marco cualquier otra casilla                 | Fallo de esa ronda: `wrongMarkPenalty` (−50 por defecto), racha a cero |
| Empieza la ronda siguiente                   | Los fallos se limpian: esas casillas vuelven a estar disponibles       |
| Vuelvo a tocar la misma casilla en esa ronda | Devuelve el veredicto anterior, sin penalizar dos veces                |

Una canción que no se marca mientras suena no se puede marcar después: solo
cuenta la ronda en curso. Lo que cambia es que fallar deja de ser definitivo.

## Diseño

**No persistir el fallo.** Una celda solo pasa a `VALID`, y únicamente al
acertar. El fallo vive en `PlayerMark`, que ya es por ronda y ya tiene clave
única `(roundId, cellId)` — esa clave es la que impide penalizar dos veces y
seguirá haciéndolo. Así la base de datos guarda solo lo duradero y el fallo es
un suceso de la ronda.

Consecuencias:

- La guarda `cell.status !== 'UNMARKED'` pasa a bloquear solo los aciertos, que
  es lo que se pretendía.
- **No hace falta migración.** El enum `CellStatus` conserva `INVALID` para el
  histórico ya guardado.
- Al reconectar, el cartón se reconstruye desde la base de datos, donde ya no
  hay fallos: la casilla aparece disponible, que es la verdad del juego.

**En el navegador.** `use-room.ts` guarda los fallos de la ronda en memoria y
los vacía al recibir `round:prepare`. `bingo-card.tsx` ya sabe pintar el
tachado, no cambia.

## Alternativas descartadas

- **Guardar `invalidatedRoundId` en la celda y limpiarlo al cerrar la ronda.**
  Añade una columna, una migración y una escritura masiva por ronda para
  representar algo que ya se puede deducir de `PlayerMark`.
- **Que las canciones ya sonadas se puedan marcar más tarde.** Se consideró y se
  descartó: elimina la tensión de reaccionar mientras suena, que es el juego.

## Pruebas

- **E2E, la regresión exacta:** en la ronda N se toca una casilla que no es la
  canción que suena y se comprueba que aparece el fallo; en la ronda N+1 esa
  misma casilla vuelve a aceptar toques. Es determinista, no depende de qué
  canción salga.
- **E2E, lo que no debe romperse:** un acierto sigue siendo permanente y no se
  limpia entre rondas.

## Partida real

Cerrada la regla, se juega una partida completa de dos jugadores de principio a
fin y se anota todo lo que falle: sincronización del audio entre dispositivos,
toques que no responden, estados raros al reconectar o al pausar. Los arreglos
salen dentro de esta misma épica, con su prueba cuando sea reproducible.

Lo que aparezca y sea grande se anota en `PROGRESS.md` en lugar de arrastrar la
épica.

## Hecho cuando

- Fallar una casilla no impide marcarla en una ronda posterior.
- Los fallos desaparecen al cambiar de ronda, en pantalla y al reconectar.
- Acertar sigue sumando igual y la racha sigue rompiéndose al fallar.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` y `pnpm test:e2e` en
  verde, y los workflows de GitHub también.
- Una partida real de dos jugadores jugada de principio a fin, con su lista de
  arreglos aplicados.
