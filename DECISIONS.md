# Decisiones técnicas

## 2026-08-05 — Gestor de paquetes y monorepo

- **Decisión**: pnpm workspaces + Turborepo.
- **Contexto**: requisito del proyecto; monorepo con apps (web, api) y paquetes compartidos.
- **Alternativas**: npm workspaces, Nx.
- **Elección**: pnpm 9.15.4 (vía corepack) + Turborepo 2.
- **Consecuencias**: instalación rápida, caché de tareas, hoisting estricto.

## 2026-08-05 — Volúmenes Docker nombrados en lugar de bind mounts

- **Decisión**: PostgreSQL y Redis usan volúmenes nombrados (`bingo-pgdata`, `bingo-redisdata`).
- **Contexto**: los bind mounts a `./docker/data` quedaban propiedad de root e impedían escribir en `docker/` sin sudo.
- **Alternativas**: bind mounts con chown manual.
- **Elección**: volúmenes nombrados gestionados por Docker; los datos persisten fuera del ciclo de vida del contenedor.
- **Consecuencias**: `docker compose down` no borra datos; nunca usar `down -v` en scripts normales.

## 2026-08-05 — ESLint 9 flat config única en la raíz

- **Decisión**: una sola configuración flat (`eslint.config.mjs`) para todo el monorepo con typescript-eslint.
- **Contexto**: evitar duplicar configuraciones por paquete y conflictos entre presets de Next/Nest.
- **Alternativas**: configs por app con `next lint` y `@nestjs` presets.
- **Consecuencias**: reglas coherentes; menos acoplamiento a herramientas de cada framework.

## 2026-08-05 — Estrategia de integración de ramas

- **Decisión**: ramas de implementación se integran en su épica con merge normal o fast-forward; las épicas se integran en `main` con `git merge --no-ff`.
- **Contexto**: conservar el árbol de épicas visible en el historial sin ruido excesivo.
- **Consecuencias**: historial legible; `main` solo recibe épicas completas.

## 2026-08-05 — Tailwind CSS 3.4 (no v4)

- **Decisión**: Tailwind 3.4 estable.
- **Contexto**: compatibilidad probada con Next.js App Router y shadcn/ui.
- **Consecuencias**: migración a v4 como mejora futura.

## 2026-08-05 — Audio demo generado por script

- **Decisión**: las 20 pistas demo son WAV generados localmente por `scripts/generate-demo-audio.mjs` (tonos y secuencias propias) y no se versionan.
- **Contexto**: no incluir música comercial protegida; mantener el repositorio ligero.
- **Consecuencias**: `pnpm demo:audio` forma parte del setup; los tests no dependen de Internet ni de Spotify.

## 2026-08-05 — Estructura del monorepo sin `packages/ui` ni `packages/config`

- **Decisión**: los componentes UI viven en `apps/web`; los presets TS en `tsconfig.base.json` raíz.
- **Contexto**: un paquete UI separado no aporta valor con una sola app web en el MVP.
- **Consecuencias**: menos indirección; extraer paquete UI cuando exista una segunda superficie.

## 2026-08-05 — Iconografía con lucide-react en lugar de emojis

- **Decisión**: sustituir todos los emoji-icono por componentes de `lucide-react`.
- **Contexto**: los emoji se renderizan distinto en cada sistema, no heredan el color del tema y no admiten `aria-label` propio.
- **Alternativas**: Heroicons, Phosphor, SVG propios.
- **Elección**: lucide-react (tree-shakeable, sin dependencias, licencia ISC).
- **Consecuencias**: iconos coherentes en claro y oscuro y accesibles; los emoji quedan reservados a texto de contenido, no a interfaz.

## 2026-08-05 — Revelado y avance de ronda configurables por partida

- **Decisión**: añadir `autoReveal`, `autoAdvance` y `roundResultsMs` a `GameSettings`.
- **Contexto**: hay dos formas de conducir una partida: automática tipo Kahoot o guiada por un presentador que comenta cada canción.
- **Alternativas**: dejarlo fijo en automático, o una sola bandera.
- **Elección**: dos banderas independientes; con `autoReveal` desactivado el motor emite `round:awaiting-reveal` y espera al anfitrión.
- **Consecuencias**: el motor no asume ritmo; el panel del anfitrión resalta «Revelar» cuando toca actuar.

## 2026-08-05 — El servidor devuelve el veredicto de cada marca

- **Decisión**: al validar una marca, el motor emite `card:updated` al participante además de responder el ack.
- **Contexto**: el cliente pintaba la celda solo al recargar, porque nunca recibía el resultado de la validación.
- **Alternativas**: marcado optimista en el cliente.
- **Elección**: el navegador nunca decide la validez; solo refleja lo que dice el servidor, y lo hace por dos vías (ack y evento) para cubrir varios dispositivos del mismo jugador.
- **Consecuencias**: imposible falsear una casilla desde el cliente; la interfaz responde al instante.

## 2026-08-05 — Google OAuth implementado a mano

- **Decisión**: implementar el flujo Authorization Code con `fetch`, sin Passport ni SDK.
- **Contexto**: solo se necesita un proveedor y el flujo son dos endpoints; Passport arrastra sesiones y estrategias que no usamos.
- **Alternativas**: `passport-google-oauth20`, Auth.js.
- **Elección**: implementación propia con `state` firmado con HMAC y caducidad de 10 minutos como protección CSRF.
- **Consecuencias**: menos dependencias y control total; si se añaden más proveedores conviene revisar la decisión.

## 2026-08-05 — Iconos PNG generados con un codificador propio

- **Decisión**: generar los iconos de la PWA con un script que escribe PNG usando el `zlib` de Node.
- **Contexto**: la PWA necesita PNG de 192, 512 y maskable; añadir `sharp` o `canvas` implica binarios nativos pesados solo para esto.
- **Alternativas**: sharp, canvas, iconos SVG en el manifest, PNG versionados en el repositorio.
- **Elección**: codificador propio (~40 líneas) invocado por `pnpm demo:assets`; los PNG no se versionan.
- **Consecuencias**: cero dependencias nativas; si el icono cambia hay que reejecutar el script.

## 2026-08-05 — El service worker nunca cachea la API

- **Decisión**: cachear solo estáticos y audio demo; la API y el WebSocket van siempre a red.
- **Contexto**: es un juego en tiempo real, servir estado de partida obsoleto sería peor que un error de red.
- **Consecuencias**: sin conexión se muestra una página offline y la partida se reanuda al recuperar red, con el estado que mande el servidor.

## 2026-08-06 — `@bingo/shared` se consume compilado y sin watcher

- **Decisión**: el paquete no tiene script `dev`; la tarea `dev` de Turborepo depende de `^build` y el `webServer` de Playwright compila el paquete antes de arrancar la API.
- **Contexto**: la API importa `dist`. Con `tsc --watch`, el paquete reescribía `dist` justo mientras la API arrancaba y `ts-node-dev` entraba en un ciclo de reinicio sin llegar a escuchar; en un checkout limpio (CI) `dist` ni siquiera existía y los E2E fallaban con `Cannot find module @bingo/shared/dist/index.js`.
- **Alternativas**: apuntar `main` a `src` y transpilar en cada consumidor; retrasar el arranque de la API; usar `tsc --watch` con `--incremental` y un delay.
- **Elección**: compilar una vez antes de arrancar. Es determinista y funciona igual en local y en CI.
- **Consecuencias**: cambiar `packages/shared` obliga a recompilar o reiniciar `pnpm dev`; a cambio, el arranque es reproducible.

## 2026-08-07 — El producto pasa a llamarse Gramola

- **Decisión**: la marca visible es **Gramola**; el bingo musical pasa a ser un modo de juego más.
- **Contexto**: el producto deja de ser un solo juego para convertirse en una plataforma de juegos musicales en directo. Un nombre que describe el juego impide añadir quiz, adivinanzas o supervivencia sin que el nombre mienta.
- **Alternativas**: mantener «Bingo Musical» y añadir modos igualmente; renombrar todo, incluidos identificadores técnicos.
- **Elección**: renombrar solo lo visible y centralizarlo en `APP_BRAND` (`packages/shared/src/brand.ts`). Cambiar el nombre comercial no debe obligar a tocar decenas de archivos.
- **Consecuencias**: metadata, manifest, cabeceras, portada, aviso de instalación y Swagger consumen la constante. Un test (`brand.test.ts`) impide que «Bingo Musical» reaparezca en el código de las apps.

## 2026-08-07 — Qué se renombra y qué no

Cada aparición se clasificó antes de tocarla. El criterio: renombrar lo que lee
una persona, conservar lo que rompería instalaciones existentes.

| Aparición                                            | Clase                      | Acción                 | Motivo                                                                                                    |
| ---------------------------------------------------- | -------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------- |
| Metadata, manifest, cabeceras, PWA                   | Marca visible              | → Gramola              | Es el nombre que se lee.                                                                                  |
| `BingoCard`, `BingoCardCell`, `Claim` de línea/bingo | Dominio del bingo          | Se mantiene            | Pertenecen a un modo concreto, no al producto.                                                            |
| `@bingo/*` (paquetes del monorepo)                   | Identificador técnico      | Se mantiene            | Renombrarlos toca 37 archivos y el lockfile sin ganancia para nadie.                                      |
| `name: bingo-musical` (Compose)                      | Infraestructura            | Se mantiene            | Es el nombre de proyecto: cambiarlo huérfana `bingo-pgdata` y `bingo-redisdata`.                          |
| `bingo_session` (cookie)                             | Compatibilidad persistente | Se mantiene            | Cambiarlo cerraría la sesión de todo el mundo al desplegar.                                               |
| `demo@bingo.local`                                   | Compatibilidad persistente | Se mantiene            | El seed hace _upsert_ por email: cambiarlo crearía un segundo usuario demo y rompería los E2E existentes. |
| `bingo.daespasa.com`                                 | Documentación              | → gramola.daespasa.com | Solo en documentación de despliegue futuro; no se toca DNS ni Cloudflare.                                 |

- **Consecuencias**: hay deuda de nombres heredados, deliberada y acotada. Se
  revisará cuando exista una migración con ventana de mantenimiento; ninguno de
  estos nombres aparece en la interfaz.

## 2026-08-07 — Renombrar el repositorio y el subdominio: todavía no

- **Decisión**: el repositorio sigue siendo `daespasa/bingo-musical` y el subdominio en uso, `bingo.daespasa.com`, durante la implementación de la épica.
- **Contexto**: `gh repo rename` deja redirección, pero rompe _remotes_ locales de cualquier clon y cualquier referencia externa; cambiar DNS a mitad de una épica no aporta nada.
- **Elección**: renombrar solo cuando toda la marca visible sea Gramola, `main` esté en verde y la documentación actualizada. La documentación de despliegue ya apunta a `gramola.daespasa.com` para que el día del cambio no haya que reescribirla.
- **Consecuencias**: la recomendación se entrega al cerrar la épica, no se ejecuta automáticamente.

## 2026-08-07 — `Game` representa cualquier partida, con handlers por modo

- **Decisión**: `Game` gana `mode` (enum `GameMode`) y el motor resuelve un `GameModeHandler` por modo, en lugar de repartir `if (game.mode === ...)` por la aplicación.
- **Contexto**: el bingo dejaba de ser el único juego. La alternativa evidente —condicionales por modo en el motor, el gateway, la puntuación y la interfaz— multiplica los sitios que hay que tocar al añadir un modo y hace imposible razonar sobre ninguno.
- **Alternativas**: condicionales por modo; una tabla por modo con su propio motor; herencia de una clase base `Game`.
- **Elección**: una interfaz (`GameModeHandler`) con cinco responsabilidades —validar configuración, crear ronda, evaluar respuesta, puntuar y decidir el final— y un registro que la resuelve. Todo lo demás (sala, código, QR, lobby, audio y su sincronización, temporizador, ranking, highlights, ceremonia, reacciones, reconexión) sigue en el motor común, sin duplicar.
- **Consecuencias**: añadir un modo es implementar la interfaz y registrarlo. El registro solo declara soportado lo que tiene handler, así que un modo a medias no puede empezar una partida.

## 2026-08-07 — El cliente nunca elige el handler

- **Decisión**: el modo se fija al crear la partida, se persiste y el servidor lo lee de ahí. Ninguna petición ni evento acepta el modo como parámetro.
- **Contexto**: si el navegador pudiera indicar con qué reglas evaluar sus respuestas, podría pedir que su partida se juzgara con las de otro modo.
- **Consecuencias**: `GameModeRegistry.resolve` parte siempre del modo persistido; la configuración se revalida al leerla, de forma que una fila JSON manipulada a mano tampoco cambia las reglas.

## 2026-08-07 — La configuración de cada modo va en JSON validado, no en columnas nullable

- **Decisión**: `Game.modeConfig` es una columna JSON validada con esquemas Zod discriminados por `mode`, con `configVersion`.
- **Contexto**: cada modo necesita campos que a los demás no les dicen nada. Como columnas serían decenas de `nullable` que ningún modo usa a la vez, y añadir un modo exigiría una migración de esquema.
- **Alternativas**: una tabla de configuración por modo; columnas nullable; JSON sin validar.
- **Elección**: JSON, pero validado **al escribir y al leer** (`packages/shared/src/game-config.ts`). Lo que comparten todos los modos (rondas, duraciones, revelado, avance, ranking) sigue en columnas de `GameSettings`, porque es consultable y no cambia al añadir modos.
- **Consecuencias**: sin `any` en ningún punto; fuera de ese archivo la configuración siempre está tipada y discriminada. El precio es que la base de datos no valida el JSON por su cuenta, y por eso la validación de lectura no es opcional.

## 2026-08-07 — Las partidas anteriores son MUSIC_BINGO sin tocar ninguna fila

- **Decisión**: `mode` se añade con `DEFAULT 'MUSIC_BINGO'` y `modeConfig` queda nulo en el historial existente.
- **Contexto**: había 176 partidas y 26 resultados en la base de datos de desarrollo; el historial no puede perderse ni mostrarse vacío.
- **Elección**: migración puramente aditiva (un `CREATE TYPE` y un `ALTER TABLE ADD COLUMN`). `readGameModeConfig` devuelve la configuración por defecto del modo cuando `modeConfig` es nulo, en lugar de fallar, que es lo que permite abrir el historial de siempre sin reescribir filas.
- **Rollback**: `ALTER TABLE "Game" DROP COLUMN mode, DROP COLUMN "modeConfig"; DROP TYPE "GameMode";` No hay pérdida de datos, porque ninguna columna preexistente se toca.
- **Consecuencias**: verificado contra la base de datos con datos reales: 176/176 partidas quedan como bingo y los 26 resultados se conservan.

## 2026-08-07 — Las variantes del bingo no duplican el motor

- **Decisión**: «Bingo a ciegas» y «Bingo clásico» son el mismo modo con distinto `revealMode`, no dos modos.
- **Contexto**: comparten cartones, generación, validación, línea, bingo, ranking, ceremonia, reacciones, The Show e historial. Lo único que cambia es qué se sabe de la canción mientras suena.
- **Elección**: `BingoRevealMode` vive en la configuración del modo (`HIDDEN_UNTIL_REVEAL` / `VISIBLE_FROM_START`), no como enum de Prisma: no hay ninguna columna que lo use y un tipo SQL sin referencias es solo ruido.
- **Consecuencias**: en «clásico» la canción viaja identificada desde el primer segundo y el reto pasa a ser encontrarla en el cartón, así que no se penaliza no reconocerla de oído.
