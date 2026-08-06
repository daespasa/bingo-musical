# Épica 2 — Colecciones y Spotify

Fecha: 2026-08-06 · Estado: aprobado, pendiente de plan de implementación

## Qué se quiere

1. Importar listas de Spotify enteras, no solo las primeras 100 canciones.
2. Gestionar las colecciones importadas: renombrar, borrar, quitar canciones y
   reordenarlas.
3. Crear una colección desde cero buscando canción a canción.
4. Colecciones temáticas propias («Éxitos en España», «Rock de los 80»…),
   regenerables.

Decidido antes de empezar: **no se conectan cuentas de Spotify.** Se mantienen
las credenciales de aplicación, que bastan para buscar e importar listas
públicas.

## El problema de fondo

`importPlaylist` resuelve el audio de cada canción **dentro de la misma
petición**, de una en una y con concurrencia 2. Con 100 canciones ya va lenta;
subir el tope sin tocar nada convertiría la importación en una petición de
varios minutos que muere por el camino y se pierde entera.

Además, Spotify dejó de dar `preview_url` a las aplicaciones nuevas, y por eso
el proyecto resuelve el audio con `spotify-preview-finder` tras la interfaz
`PreviewProvider`. Que una canción esté en Spotify no garantiza que suene.

## Diseño

### Importar en dos fases

1. **Metadatos, en el momento.** Se paginan las canciones de la lista hasta un
   tope de **500** y se crean la colección y sus canciones. Son segundos.
   Si la lista tiene más, se importan las primeras 500 y se dice cuántas se han
   dejado fuera.
2. **Audio, por detrás.** La resolución de previews sigue en segundo plano
   sobre el proceso de la API, con la concurrencia que ya limita el proveedor.

El progreso no necesita columnas nuevas: se cuenta cuántas canciones de la
colección tienen ya una preview resuelta. La pantalla muestra «suenan 120 de
340» y deja usar la colección en cuanto haya suficientes.

Si la API se reinicia a mitad, la resolución se corta. Se resuelve con un botón
para reanudarla, y con la revalidación que ya se hace antes de empezar una
partida.

### Gestionar

Endpoints nuevos sobre `MusicCollection`, todos restringidos a la persona
dueña; demo y temáticas son de solo lectura:

- Crear una colección vacía.
- Renombrar y cambiar la descripción.
- Borrar la colección.
- Quitar una canción.
- Reordenar canciones.

**Borrar con partidas asociadas.** `Game.collectionId` es obligatorio y sin
regla de borrado, así que borrar una colección usada por partidas reventaría
contra la base de datos. La API se niega con un mensaje que dice cuántas
partidas la usan. Nunca se borran partidas en cascada: el historial es de la
persona, no un daño colateral.

**Reordenar.** `MusicCollectionTrack` tiene `unique(collectionId, position)`,
así que intercambiar dos posiciones falla a mitad de camino. La reordenación se
hace en una transacción: primero se desplazan las posiciones afectadas a un
rango temporal negativo y después se escriben las definitivas.

### Canción a canción

Se reutiliza la búsqueda que ya existe. Se busca, se añade a una colección y el
audio de esa canción se resuelve en el momento, porque es una sola.

### Temáticas

Las temáticas son colecciones normales marcadas con una clave de tema. Requiere
migración: `MusicCollection` gana `themeKey` (único cuando existe) y
`refreshedAt`.

Los temas se definen en código, cada uno con su consulta de búsqueda (género,
años y mercado). Un servicio los construye buscando en Spotify, resolviendo el
audio de las candidatas y quedándose solo con las que suenan.

**Un refresco nunca puede dejar una temática peor de lo que estaba.** Si la
nueva versión no llega a un mínimo de canciones que suenan, se conserva la
anterior y se registra que el intento no prosperó. Se sustituye entera y de
golpe, dentro de una transacción.

**Se lanza a mano**, con un comando documentado. Se descartó el refresco
automático: un cron en el proceso de la API no se ejecuta si el equipo está
apagado a esa hora y falla en silencio, y añadía una dependencia para algo que
se hace de tarde en tarde.

Sin credenciales de Spotify el comando no hace nada y lo dice; las temáticas
simplemente no aparecen, igual que hoy no aparece la búsqueda.

## Pruebas

Regla del proyecto: **ninguna prueba depende de Spotify ni de Internet.**

- **Unitarias** con un proveedor falso: el tope de importación y el recuento de
  lo que queda fuera, el reordenado con la restricción de posición, la regla de
  «no empeorar una temática» y la validez de las definiciones de temas.
- **E2E** sobre lo que funciona sin credenciales: crear una colección vacía,
  renombrarla, quitarle canciones, borrarla, que negarse a borrar una colección
  con partidas se explique bien, y que demo y temáticas no se puedan editar.

## Hecho cuando

- Una lista de más de 100 canciones se importa entera hasta el tope, y la
  pantalla dice cuántas suenan mientras se resuelven.
- Se puede crear, renombrar, reordenar, quitar canciones y borrar, y borrar una
  colección con partidas se explica en lugar de fallar.
- Se puede montar una colección buscando canción a canción.
- `pnpm themes:build` construye las temáticas y dice de cada una cuántas
  suenan; un refresco fallido deja la anterior intacta.
- El README explica cómo refrescarlas.
- Lint, typecheck, tests, build y E2E en verde, y los workflows también.
