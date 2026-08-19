# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Changed

- La portada cuenta qué es Gramola, qué hace falta para empezar y qué se juega, en
  vez de describir cómo se validan las jugadas del bingo. Los tres créditos pasan a
  ser los tres pasos de montar una partida.
- Salir de una partida devuelve a cada quien a su sitio: quien tiene cuenta vuelve
  a sus partidas y el invitado a la portada. El botón lo dice, para que salir no se
  confunda con cerrar sesión.
- Cada modo enseña su propia configuración: el cartón y las reglas de línea y bingo solo
  aparecen en el bingo, y la sala de espera y el resumen de partida dicen el dato que
  corresponde a cada modo (opciones, intentos, vidas o mezcla).
- En el quiz, cada opción de una pregunta de título lleva el artista debajo, para que dos
  canciones homónimas se distingan y quien reconoce la voz tenga por dónde agarrarse. En
  las preguntas de artista no aparece: sería regalar la respuesta.

## [0.6.0] - 2026-08-11

**Bingo Musical pasa a llamarse Gramola** y deja de ser un solo juego para
convertirse en una plataforma de juegos musicales en directo. El bingo sigue
siendo el modo insignia; ahora comparte motor con otros cuatro.

### Added

- **Cuatro modos de juego nuevos**, además del bingo:
  - **Quiz musical**: escucha el fragmento y elige entre 2 y 4 opciones. Pregunta
    por título, artista o década, con distractores tomados de la propia
    colección. Al revelar se ve el reparto de respuestas.
  - **Adivina la canción**: sin opciones, se escribe la respuesta. Se aceptan
    acentos, mayúsculas, puntuación, «feat», «&» y erratas razonables, con
    intentos configurables.
  - **Supervivencia**: cada error cuesta una vida y gana quien queda en pie.
    Quien cae sigue viendo la partida como espectador.
  - **Modo mixto**: cada ronda cambia de reto, con el reparto que elija el
    anfitrión.
- **Bingo clásico**, segunda variante del bingo: la canción se ve desde el
  primer segundo, así que el reto es encontrarla en el cartón y no reconocerla
  de oído. Pensado para grupos con niveles musicales muy distintos; fallar una
  casilla no resta.
- **Selector de modo** al crear la partida, con jugadores recomendados,
  dificultad, soporte de proyector y de juego remoto.
- **Revancha** al terminar: crea una sala nueva con la misma configuración sin
  tocar el historial de la partida anterior.
- **Año de publicación** en las pistas, que alimenta las preguntas de década.
  Las 20 pistas demo se reparten entre cinco décadas.

### Changed

- **La marca visible pasa a ser Gramola** en metadata, PWA, cabeceras, portada,
  aviso de instalación y Swagger, centralizada en una única constante.
- **`Game` representa cualquier partida.** El modo se persiste y el servidor
  resuelve un handler por modo, en lugar de repartir condicionales. Añadir un
  modo es implementar una interfaz y registrarlo.
- **El resumen entre rondas y la ceremonia hablan el idioma de cada modo**:
  aciertos en vez de cartones, erratas que colaron, caídas y supervivientes,
  orden de eliminación.
- El historial muestra el modo y la variante de cada partida.

### Fixed

- **El resumen decía «no la tenía nadie» en todos los modos nuevos.** Los
  aciertos se contaban siempre como marcas de cartón. De paso, el «N de M»
  contaba participantes en vez de jugadores, así que incluía al anfitrión y a
  la pantalla de proyección.
- **La imagen de Docker no se construía fuera de un checkout limpio.** Faltaba
  un `.dockerignore`, así que el contexto arrastraba los `node_modules` del
  host —enlaces simbólicos de pnpm— y los dejaba caer encima de los del
  contenedor.
- **La suite E2E completa nunca había pasado entera.** Fallaba un test distinto
  en cada ejecución porque el ayudante de sesión compartida daba por válida una
  sesión ya revocada.

### Security

- En los modos que preguntan, **la solución no sale del servidor antes del
  revelado**: ni en el payload, ni en el acuse de recibo, ni moviendo el
  marcador. Cubierto por tests de unidad y por E2E que inspeccionan el HTML
  servido y el objeto `window`.
- La comparación difusa de respuestas es deliberadamente conservadora: la
  tolerancia depende de la longitud, así que ninguna palabra corta vale por
  otra. Sin IA ni servicios externos.
- Las vidas de Supervivencia se persisten y las decide siempre el servidor:
  reconectar no las devuelve, y quien está eliminado no puede responder.

### Migrations

Tres migraciones, todas aditivas y verificadas sobre una base de datos con
datos reales. Las partidas anteriores quedan como `MUSIC_BINGO` sin reescribir
ninguna fila.

- `add_game_mode_and_config`
- `add_quiz_questions_and_release_year`
- `add_player_life_state`

## [0.5.2] - 2026-08-07

### Fixed

- **Con la sesión caducada la aplicación se quedaba dando errores sin echarte.**
  La comprobación de acceso solo miraba que la cookie existiera, no que
  siguiera valiendo, así que entrabas al panel y todo fallaba por dentro. Ahora
  cualquier respuesta de sesión no válida te devuelve al acceso y te explica por
  qué. Pasaba también al cerrar la sesión desde otro dispositivo, que es
  justo lo que se añadió en la versión anterior.

  El cierre de sesión se confirma antes de aplicarse: un 401 suelto puede ser
  una carrera al recién entrar, y expulsar por eso sería peor que el problema
  que se arregla.

## [0.5.0] - 2026-08-07

El espectáculo entre rondas y la cuenta.

### Added

- **Resumen entre canción y canción**: cuánta gente la tenía, quién la cazó
  antes y en cuánto, qué rachas siguen vivas y quién ha adelantado a quién.
  Sale en el móvil y en la proyección.
- **Reacciones**: seis reacciones que suben flotando por la pantalla de
  proyección con el nombre de quien la lanza. Repertorio cerrado, sin servicio
  externo de imágenes y sin nada que moderar; una cada tres segundos por
  persona.
- **Disco girando y ecualizador** en la proyección mientras suena el fragmento.
- **Tu cuenta**: cambiar el nombre con el que te ve la gente, cambiar la
  contraseña comprobando la actual, y cerrar sesión en los demás dispositivos.
- **Dashboard de verdad**: saluda por tu nombre, te devuelve a la sala que
  tengas abierta y resume partidas, canciones y partidas jugadas.

### Changed

- El header marca la sección en la que estás con un canto grueso y
  `aria-current`; antes no había forma de saberlo.
- Textos repasados para hablar de lo que le importa a quien juega: fuera «el
  servidor valida», «playlist» y «previews».

## [0.4.0] - 2026-08-06

Colecciones: importar listas enteras, gestionarlas y colecciones temáticas.

### Added

- **Importar listas enteras** hasta 500 canciones, en dos fases: la colección
  aparece en segundos con todas las canciones y el audio se comprueba por
  detrás mientras la pantalla va contando cuántas suenan.
- **Gestionar colecciones**: crear, renombrar, borrar, quitar canciones,
  reordenarlas y duplicar. Duplicar permite partir de una colección de la
  aplicación, que es de solo lectura.
- **Montar una colección canción a canción** buscando en Spotify y eligiendo el
  destino en los propios resultados.
- **Seis colecciones temáticas** que mantiene la aplicación, construidas con
  `pnpm themes:build`. Solo entran canciones que suenan, y un refresco nunca
  deja una temática peor: si no llega a 30 reproducibles, se conserva la
  anterior.

### Fixed

- El cliente HTTP pedía JSON en toda respuesta, incluidas las 204 sin cuerpo,
  así que cualquier operación sin respuesta fallaba en silencio.
- Los errores de Spotify eran `Error` a secas y llegaban como «Internal server
  error»; ahora explican qué ha pasado.
- La pantalla de música dejaba de funcionar entera sin credenciales de Spotify,
  aunque gestionar colecciones no las necesita.
- La paginación de listas avanzaba contando canciones válidas en vez de
  elementos, de modo que una lista con episodios repetía canciones.

## [0.3.1] - 2026-08-06

### Fixed

- **Fallar una casilla ya no la inutiliza el resto de la partida.** Al fallar se
  escribía el fallo en la casilla, y la guarda de entrada rechaza cualquier
  casilla que no esté sin marcar: tocar una antes de que sonara su canción
  impedía marcarla cuando por fin sonaba. El fallo pasa a vivir solo en la
  marca de la ronda y se limpia al empezar la siguiente.
- Terminar la partida pedía confirmación con un aviso del navegador, que rompe
  el diseño y en la aplicación instalada se ve como algo ajeno. Ahora la
  confirmación es propia y sus botones dicen lo que hacen.
- La prueba de reconexión comprobaba que una casilla fallada seguía bloqueada
  tras recargar, es decir, daba el defecto por bueno. Ahora comprueba que el
  cartón y la puntuación sobreviven a la recarga.

### Added

- Sonda de partida real (`e2e/real-game.probe.spec.ts`), fuera de la suite:
  juega con tres jugadores, ejercita todos los controles del anfitrión y anota
  errores de consola, peticiones fallidas y toques sin respuesta.
- Etiqueta accesible en el marcador de puntos.

## [0.3.0] - 2026-08-06

Refinamientos sobre el sistema visual, a partir de las variantes generadas con
Google Stitch desde `DESIGN.md`.

### Added

- Código de sala en seis casillas separadas, sobre un único campo de texto para
  no romper el pegado, el autorrelleno ni los lectores de pantalla. Al
  completarse entra en la sala sin pulsar nada más.
- Escaneo del QR de la sala con la cámara, usando el detector del navegador. Es
  un atajo opcional: si el navegador no lo admite el botón no aparece, y si se
  deniega la cámara lo explica y deja escribir el código.
- `ROOM_CODE_ALPHABET`, `normalizeRoomCode` y `extractRoomCode` en
  `@bingo/shared`, con 11 tests. El servidor que genera los códigos y el
  formulario que los recoge ya no pueden discrepar.
- Etiqueta accesible en el buscador de Spotify, que solo tenía texto de ayuda.
- Cobertura E2E de la entrada por código, que no se probaba.

### Changed

- La carátula de la portada va enmarcada dentro de la funda, como una lámina
  pegada, en lugar de ir a sangre.
- El test de Spotify ya no da por hecho que no hay credenciales: pregunta al
  servidor por su estado y comprueba que la pantalla cuenta lo mismo. Antes
  fallaba en cuanto alguien configuraba Spotify en su máquina.

## [0.2.0] - 2026-08-06

Identidad visual propia: la interfaz pasa de un tema violeta genérico a un
sistema de funda de disco. Ver [DESIGN.md](DESIGN.md).

### Added

- Sistema de diseño documentado con paleta, tipografía, forma y firma.
- `.vinyl`: disco dibujado en CSS que indica el estado de la ronda. Gira
  mientras suena el fragmento y se para cuando se cierra la ventana para
  marcar, de modo que el movimiento informa en lugar de decorar.
- Tipografía servida desde el propio dominio: Archivo Black para rótulos,
  Archivo para texto y DM Mono para códigos de sala, tiempos y puntuaciones.

### Changed

- Paleta de papel hueso y tinta cálida con naranja de etiqueta discográfica
  como único color de acción; verde para lo acertado, oro para línea y bingo y
  ladrillo para errores.
- Portada reconstruida: un disco saliendo de su funda cuya carátula es un
  cartón real, en lugar del titular con degradado y las píldoras de
  características.
- Casillas del cartón tratadas como una lista de canciones; la fallada se tacha
  y no depende solo del color.
- Botones con canto de tinta y sombra dura que se hunden al pulsarlos.
- Iconos de la PWA y colores del manifest repintados con la nueva paleta.

### Fixed

- Encabezados de sección que quedaban en un tono demasiado claro para leerse
  con comodidad sobre el fondo.

## [0.1.1] - 2026-08-06

### Fixed

- Los paquetes del workspace se compilan antes de arrancar los servidores de desarrollo: la tarea `dev` de Turborepo depende de `^build` y el `webServer` de Playwright construye las dependencias de cada app (`pnpm --filter "<app>^..." build`) porque no pasa por Turborepo. En un checkout limpio los E2E fallaban con `Cannot find module @bingo/shared/dist/index.js` y, tras arreglar ese paquete, con el mismo error en `@bingo/music-providers`; era la causa del workflow E2E en rojo.
- `@bingo/shared` pierde su script `dev`: el `tsc --watch` reescribía `dist` mientras la API arrancaba y dejaba a `ts-node-dev` reiniciando sin llegar a escuchar, de modo que `pnpm dev` no levantaba la API.

## [0.1.0] - 2026-08-05

Primera versión local jugable del bingo musical.

### Added

- **Infraestructura**: monorepo pnpm + Turborepo con TypeScript estricto, ESLint, Prettier, Husky, lint-staged y commitlint; Docker Compose con PostgreSQL 16 y Redis 7 con healthchecks y volúmenes persistentes; workflows de CI y E2E en GitHub Actions.
- **Datos**: esquema Prisma con 27 modelos (usuarios, sesiones, música, partidas, salas, cartones, rondas, marcas, reclamaciones, puntuación, highlights, resultados y auditoría), migraciones y seed con usuario demo, 20 pistas, colección, partida lista y partida terminada con historial.
- **Autenticación**: registro e inicio de sesión con Argon2id, sesiones persistentes en cookie HttpOnly con renovación deslizante, cierre de otros dispositivos, protección de rutas e inicio de sesión con Google (OAuth 2.0 con state firmado).
- **Música**: colección demo de 20 pistas sintetizadas libres de derechos generadas localmente; búsqueda e importación de playlists públicas de Spotify; `spotify-preview-finder` encapsulado tras la interfaz `PreviewProvider` con timeout, caché, reintentos con backoff, concurrencia máxima de 2 y validación de URL.
- **Partidas y salas**: asistente de creación con colección, tamaño de cartón, duración de fragmento y reglas; salas con código de 6 caracteres, QR, expiración y bloqueo; entrada de invitados con alias único por sala y token firmado.
- **Cartones**: generación determinista en servidor con semilla reproducible, tamaños 3×3, 4×4 y 5×5, centro libre opcional y sin canciones repetidas.
- **Tiempo real**: gateway Socket.IO con adaptador Redis, contratos tipados compartidos, presencia y reconexión que conserva cartón y puntuación.
- **Partida**: máquina de estados de ronda con precarga confirmada y reproducción programada en un instante común, revelado y avance de ronda configurables (automáticos o manuales), y controles del anfitrión (iniciar, pausar, reanudar, repetir, +10 s, revelar, omitir, siguiente, expulsar, bloquear y finalizar).
- **Puntuación**: marcas validadas siempre en servidor con bonus por velocidad y racha, penalizaciones, detección de línea y bingo transaccional, ranking en vivo y momentazos.
- **Resultados**: ceremonia de podio escalonada con confeti, resumen persistido por sala, historial y duplicado de partidas.
- **Interfaz**: diseño mobile-first con tema claro y oscuro, iconografía vectorial, animaciones de marcado, fallo, línea y bingo, vista de proyector y estados de carga, vacío, error y reconexión.
- **PWA**: manifest con iconos generados, service worker que cachea interfaz y audio demo pero nunca la API, página offline y aviso de instalación.
- **Calidad**: 60 tests unitarios (generación de cartones, línea, bingo, puntuación, normalización, coincidencia de previews, tokens firmados) y 10 tests E2E con Playwright que no dependen de Internet.

### Known issues

- Reiniciar la API durante una partida pierde el estado en memoria de esa sala.
- El modo híbrido está modelado pero no implementado.
- Las reclamaciones solo cubren fila horizontal y cartón completo.
