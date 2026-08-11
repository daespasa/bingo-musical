# Decisiones técnicas

Registro de por qué el proyecto está hecho como está. Cada entrada recoge la
decisión, el contexto que la obligó, las alternativas descartadas y lo que
costó tomarla. Orden cronológico; la más reciente al final.

<details>
<summary><strong>Índice de decisiones (49)</strong></summary>

- [2026-08-05 — Gestor de paquetes y monorepo](#2026-08-05-gestor-de-paquetes-y-monorepo)
- [2026-08-05 — Volúmenes Docker nombrados en lugar de bind mounts](#2026-08-05-volúmenes-docker-nombrados-en-lugar-de-bind-mounts)
- [2026-08-05 — ESLint 9 flat config única en la raíz](#2026-08-05-eslint-9-flat-config-única-en-la-raíz)
- [2026-08-05 — Estrategia de integración de ramas](#2026-08-05-estrategia-de-integración-de-ramas)
- [2026-08-05 — Tailwind CSS 3.4 (no v4)](#2026-08-05-tailwind-css-34-no-v4)
- [2026-08-05 — Audio demo generado por script](#2026-08-05-audio-demo-generado-por-script)
- [2026-08-05 — Estructura del monorepo sin `packages/ui` ni `packages/config`](#2026-08-05-estructura-del-monorepo-sin-packagesui-ni-packagesconfig)
- [2026-08-05 — Iconografía con lucide-react en lugar de emojis](#2026-08-05-iconografía-con-lucide-react-en-lugar-de-emojis)
- [2026-08-05 — Revelado y avance de ronda configurables por partida](#2026-08-05-revelado-y-avance-de-ronda-configurables-por-partida)
- [2026-08-05 — El servidor devuelve el veredicto de cada marca](#2026-08-05-el-servidor-devuelve-el-veredicto-de-cada-marca)
- [2026-08-05 — Google OAuth implementado a mano](#2026-08-05-google-oauth-implementado-a-mano)
- [2026-08-05 — Iconos PNG generados con un codificador propio](#2026-08-05-iconos-png-generados-con-un-codificador-propio)
- [2026-08-05 — El service worker nunca cachea la API](#2026-08-05-el-service-worker-nunca-cachea-la-api)
- [2026-08-06 — `@bingo/shared` se consume compilado y sin watcher](#2026-08-06-@bingoshared-se-consume-compilado-y-sin-watcher)
- [2026-08-07 — El producto pasa a llamarse Gramola](#2026-08-07-el-producto-pasa-a-llamarse-gramola)
- [2026-08-07 — Qué se renombra y qué no](#2026-08-07-qué-se-renombra-y-qué-no)
- [2026-08-07 — Renombrar el repositorio y el subdominio: todavía no](#2026-08-07-renombrar-el-repositorio-y-el-subdominio-todavía-no)
- [2026-08-07 — `Game` representa cualquier partida, con handlers por modo](#2026-08-07-game-representa-cualquier-partida-con-handlers-por-modo)
- [2026-08-07 — El cliente nunca elige el handler](#2026-08-07-el-cliente-nunca-elige-el-handler)
- [2026-08-07 — La configuración de cada modo va en JSON validado, no en columnas nullable](#2026-08-07-la-configuración-de-cada-modo-va-en-json-validado-no-en-columnas-nullable)
- [2026-08-07 — Las partidas anteriores son MUSIC_BINGO sin tocar ninguna fila](#2026-08-07-las-partidas-anteriores-son-music_bingo-sin-tocar-ninguna-fila)
- [2026-08-07 — Las variantes del bingo no duplican el motor](#2026-08-07-las-variantes-del-bingo-no-duplican-el-motor)
- [2026-08-07 — El selector de modo se añade al formulario, no lo convierte en pasos](#2026-08-07-el-selector-de-modo-se-añade-al-formulario-no-lo-convierte-en-pasos)
- [2026-08-07 — Los modos no jugables se enseñan, pero deshabilitados](#2026-08-07-los-modos-no-jugables-se-enseñan-pero-deshabilitados)
- [2026-08-07 — En bingo clásico, fallar una casilla no resta](#2026-08-07-en-bingo-clásico-fallar-una-casilla-no-resta)
- [2026-08-07 — La canción visible se muestra junto al estado de la ronda, no en su lugar](#2026-08-07-la-canción-visible-se-muestra-junto-al-estado-de-la-ronda-no-en-su-lugar)
- [2026-08-08 — La solución del quiz no sale del servidor antes del reveal](#2026-08-08-la-solución-del-quiz-no-sale-del-servidor-antes-del-reveal)
- [2026-08-08 — Ni el ack ni el ranking delatan el acierto](#2026-08-08-ni-el-ack-ni-el-ranking-delatan-el-acierto)
- [2026-08-08 — Las opciones se ven antes de poder pulsarse](#2026-08-08-las-opciones-se-ven-antes-de-poder-pulsarse)
- [2026-08-08 — Los distractores salen de la propia colección](#2026-08-08-los-distractores-salen-de-la-propia-colección)
- [2026-08-08 — La pregunta se genera con semilla estable y se persiste](#2026-08-08-la-pregunta-se-genera-con-semilla-estable-y-se-persiste)
- [2026-08-08 — Fallar en el quiz no resta por defecto](#2026-08-08-fallar-en-el-quiz-no-resta-por-defecto)
- [2026-08-08 — Los años del catálogo demo se reparten por décadas](#2026-08-08-los-años-del-catálogo-demo-se-reparten-por-décadas)
- [2026-08-08 — La comparación de respuestas vive aparte de `normalizeText`](#2026-08-08-la-comparación-de-respuestas-vive-aparte-de-normalizetext)
- [2026-08-08 — El fuzzy es conservador por longitud, no por porcentaje](#2026-08-08-el-fuzzy-es-conservador-por-longitud-no-por-porcentaje)
- [2026-08-08 — Política explícita de artistas y colaboraciones](#2026-08-08-política-explícita-de-artistas-y-colaboraciones)
- [2026-08-08 — Ni el ack ni el intento delatan el acierto](#2026-08-08-ni-el-ack-ni-el-intento-delatan-el-acierto)
- [2026-08-08 — Se guardan todos los intentos, no solo el veredicto](#2026-08-08-se-guardan-todos-los-intentos-no-solo-el-veredicto)
- [2026-08-08 — Supervivencia no duplica evaluadores: deriva la configuración del modo de ronda](#2026-08-08-supervivencia-no-duplica-evaluadores-deriva-la-configuración-del-modo-de-ronda)
- [2026-08-08 — Las vidas se persisten y nunca las decide el cliente](#2026-08-08-las-vidas-se-persisten-y-nunca-las-decide-el-cliente)
- [2026-08-08 — Las vidas no son puntos](#2026-08-08-las-vidas-no-son-puntos)
- [2026-08-08 — El desempate de Supervivencia es determinista](#2026-08-08-el-desempate-de-supervivencia-es-determinista)
- [2026-08-08 — No responder cuesta vida, pero es configurable](#2026-08-08-no-responder-cuesta-vida-pero-es-configurable)
- [2026-08-08 — El modo mixto reparte con resto mayor e intercalado proporcional](#2026-08-08-el-modo-mixto-reparte-con-resto-mayor-e-intercalado-proporcional)
- [2026-08-08 — El bingo no entra en el modo mixto](#2026-08-08-el-bingo-no-entra-en-el-modo-mixto)
- [2026-08-08 — El resumen entre rondas se generaliza, no se duplica](#2026-08-08-el-resumen-entre-rondas-se-generaliza-no-se-duplica)
- [2026-08-08 — El recuento de aciertos depende del modo](#2026-08-08-el-recuento-de-aciertos-depende-del-modo)
- [2026-08-08 — La revancha duplica la partida en lugar de reabrir la sala](#2026-08-08-la-revancha-duplica-la-partida-en-lugar-de-reabrir-la-sala)
- [2026-08-11 — El fallo intermitente de los E2E no era aleatorio](#2026-08-11-el-fallo-intermitente-de-los-e2e-no-era-aleatorio)

</details>

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

## 2026-08-07 — El selector de modo se añade al formulario, no lo convierte en pasos

- **Decisión**: `/dashboard/games/new` gana secciones nuevas (modo y variante) en la misma página, en lugar de convertirse en un asistente con pasos.
- **Contexto**: los E2E de partida rellenan todos los campos de esa página en una sola pasada. Un asistente por pasos los habría roto todos a la vez, y romper la cobertura de la partida completa para reordenar campos es una mala compra.
- **Alternativas**: máquina de pasos con estado; asistente en varias rutas.
- **Elección**: las secciones aparecen en el orden del flujo (modo → variante → nombre → música → cartón → ritmo → reglas), que es lo que el paso a paso pretendía ordenar. Los campos específicos del modo solo se renderizan para el modo elegido.
- **Consecuencias**: sin regresión en los E2E existentes (8/8 en verde tras el cambio). Si más adelante los modos traen configuraciones largas, el paso a paso se puede introducir entonces, ya con el dominio resuelto.

## 2026-08-07 — Los modos no jugables se enseñan, pero deshabilitados

- **Decisión**: el selector muestra las cinco tarjetas; las de los modos sin handler salen como «Próximamente» y con el botón deshabilitado.
- **Contexto**: esconderlos dejaría al anfitrión sin saber hacia dónde va Gramola; enseñarlos activos sería prometer algo que al pulsar no lleva a ninguna parte.
- **Elección**: la disponibilidad sale del catálogo compartido, así que cliente y servidor no pueden discrepar; el registro además se niega a resolver un handler inexistente, de forma que la API tampoco los acepta aunque alguien salte la interfaz.
- **Consecuencias**: activar un modo es cambiar su `availability` **después** de registrar su handler, no antes.

## 2026-08-07 — En bingo clásico, fallar una casilla no resta

- **Decisión**: con `VISIBLE_FROM_START`, una marca equivocada puntúa 0 en lugar de aplicar `wrongMarkPenalty`.
- **Contexto**: la canción está identificada en pantalla. Fallar no es «no la he reconocido de oído», es «he tocado otra casilla mientras buscaba». Penalizarlo castiga justo al público al que esta variante quiere incluir: familias, mayores, grupos con niveles musicales muy distintos.
- **Alternativas**: mantener la penalización; reducirla a la mitad.
- **Elección**: sin penalización. Lo que sigue premiándose es la velocidad al encontrarla, la línea y el bingo.
- **Consecuencias**: la regla vive en `MusicBingoHandler.calculateScore`, no en el motor, así que el motor no sabe nada de variantes. El bingo a ciegas mantiene la penalización intacta.

## 2026-08-07 — La canción visible se muestra junto al estado de la ronda, no en su lugar

- **Decisión**: en bingo clásico, el título aparece sobre el estado de la ronda, no sustituyéndolo.
- **Contexto**: la primera versión sustituía el bloque de estado por el título, y quien jugaba perdía la cuenta atrás y el «últimos segundos para marcar». Lo detectó un E2E antes de llegar a ninguna parte.
- **Consecuencias**: se ve a la vez qué suena y cuánto queda. Tras el reveal el encabezado desaparece, porque entonces manda «La canción era…» y repetir el título dos veces solo añade ruido.

## 2026-08-08 — La solución del quiz no sale del servidor antes del reveal

- **Decisión**: la ronda de quiz tiene dos formas. `QuizRoundPayload` vive solo en el servidor e incluye `correctIndex` y `correctText`; hacia la red se convierte con `toPublicQuizRound`, que devuelve únicamente tipo, enunciado y opciones.
- **Contexto**: en un juego de preguntas, filtrar la respuesta lo rompe entero. Basta con abrir el inspector para ganar, y quien lo hace ni siquiera necesita saber programar: `correctIndex: 2` se lee solo.
- **Alternativas**: mandar la ronda entera y confiar en que el cliente no la mire; ofuscar la respuesta; cifrarla y mandar la clave al revelar.
- **Elección**: que la respuesta no viaje. Una sola función es la puerta por la que la ronda sale hacia la red, así que añadir un campo sensible a la ronda no lo cuela solo: hay que añadirlo también a la vista pública, a mano.
- **Consecuencias**: hay tests que comprueban que la vista pública no tiene esos campos, y un E2E que inspecciona el HTML servido y el objeto `window` buscando `correctIndex`, `correctText` e `isCorrect`. También obligó a las dos decisiones siguientes.

## 2026-08-08 — Ni el ack ni el ranking delatan el acierto

- **Decisión**: responder devuelve solo si se ha registrado el envío, y la puntuación del quiz se aplica **al cerrar la ronda**, no al responder.
- **Contexto**: aunque la solución no viaje, un ack que diga «correcto» la revela igual. Y un marcador público que sube justo al pulsar la delata ante toda la sala.
- **Elección**: el ack confirma recepción y nada más; `scoreQuizRound` aplica todos los puntos en el reveal. A la sala solo se le dice cuánta gente lleva respondido, sin decir quién ni qué.
- **Consecuencias**: `leaderboard:updated` no se emite entre respuestas en quiz. A cambio, el ranking cuenta la historia de golpe al revelar, que además se parece más a un concurso.

## 2026-08-08 — Las opciones se ven antes de poder pulsarse

- **Decisión**: las opciones aparecen con `round:prepare`, pero deshabilitadas hasta `round:started`.
- **Contexto**: el servidor solo acepta respuestas mientras la ronda está abierta. La primera versión enseñaba botones pulsables antes de que arrancara el fragmento: se podían pulsar y el servidor los rechazaba en silencio. Lo destapó un E2E.
- **Elección**: mostrarlas cuanto antes —da tiempo a leerlas, que es parte del juego— pero desactivadas y con el texto «Prepara el oído…». Un botón que el servidor va a rechazar es peor que un botón desactivado.

## 2026-08-08 — Los distractores salen de la propia colección

- **Decisión**: las opciones incorrectas se toman de las demás pistas de la colección que suena.
- **Contexto**: un distractor traído de fuera se reconoce al instante y convierte la pregunta en un regalo.
- **Elección**: candidatos de la colección, sin repetir la respuesta correcta ni valores idénticos a ella. Las décadas admiten relleno con décadas vecinas cuando la colección es pequeña, porque siguen siendo respuestas creíbles; los años y los títulos no se inventan nunca.
- **Consecuencias**: si la colección no da para construir una pregunta de un tipo, ese tipo se descarta en vez de plantearse con una sola opción. `supportedQuestionTypes` lo decide antes de empezar.

## 2026-08-08 — La pregunta se genera con semilla estable y se persiste

- **Decisión**: la pregunta se construye con un generador sembrado por sala y ronda, y se guarda en `RoundQuestion` + `AnswerOption` antes de emitirse.
- **Contexto**: si se regenerara al vuelo, quien reconecta podría recibir otras opciones —u otro orden— que el resto de la sala, y el resultado no sería reconstruible después.
- **Consecuencias**: todo el mundo ve exactamente la misma pregunta, reconectar no la cambia, y el historial puede reconstruirse sin volver a generarla.

## 2026-08-08 — Fallar en el quiz no resta por defecto

- **Decisión**: `wrongAnswerPenalty` es 0 salvo que el anfitrión lo cambie.
- **Contexto**: penalizar el fallo empuja a no responder cuando hay dudas, que es justo lo contrario de lo que hace divertida una partida.
- **Consecuencias**: no responder tampoco suma, y rompe racha igual que fallar. Quien quiera un concurso más duro tiene la penalización disponible.

## 2026-08-08 — Los años del catálogo demo se reparten por décadas

- **Decisión**: las 20 pistas demo reciben año, con cuatro pistas en cada una de cinco décadas.
- **Contexto**: las preguntas de década necesitan distractores creíbles. Con todas las pistas en la misma década, la pregunta se responde sola.
- **Elección**: años inventados y deterministas, como el resto de los metadatos demo. El seed los aplica también a las pistas ya creadas, para que una instalación anterior no se quede sin ellos.

## 2026-08-08 — La comparación de respuestas vive aparte de `normalizeText`

- **Decisión**: `answer-matching.ts` es un módulo nuevo, con su propia normalización, en lugar de reutilizar `normalizeText`.
- **Contexto**: `normalizeText` alimenta `Track.normalizedTitle` y `Artist.normalizedName`, que son **claves de búsqueda ya persistidas**. Cambiar su comportamiento para que tolere erratas rompería las búsquedas y los `upsert` de todo el catálogo.
- **Alternativas**: ampliar `normalizeText`; añadirle un parámetro de modo.
- **Elección**: dos funciones para dos problemas distintos. Normalizar una clave de base de datos y juzgar lo que alguien teclea con prisa en el móvil no son lo mismo.
- **Consecuencias**: ninguna migración de datos ni riesgo sobre el catálogo existente.

## 2026-08-08 — El fuzzy es conservador por longitud, no por porcentaje

- **Decisión**: la tolerancia a erratas depende de la longitud de la respuesta esperada: 0 hasta cinco letras, 1 hasta ocho, 2 hasta doce y 3 por encima. Además se exige un parecido global mínimo del 80 %.
- **Contexto**: un umbral porcentual único es demasiado laxo con las respuestas cortas. Con solo el 80 % de parecido, «Ella» se daba por buena para «Bella» —lo detectó un test antes de que llegara a ninguna parte—, igual que «Sal» por «Sol» o «Casa» por «Cosa». Son canciones distintas, no erratas.
- **Alternativas**: umbral porcentual único; distancia fija; aceptar solo exacto.
- **Elección**: distancia de Damerau-Levenshtein (cuenta la transposición de dos letras contiguas como **un** error, que es la errata típica del pulgar) con umbrales por tramos de longitud. Así «tit me pregunto» vale para «Titi Me Preguntó», y ninguna palabra de cuatro letras vale por otra.
- **Consecuencias**: hay ocho tests dedicados exclusivamente a comprobar que el fuzzy **no** cuela. Si alguien afloja los umbrales, fallan.

## 2026-08-08 — Política explícita de artistas y colaboraciones

- **Decisión**: se acepta el artista principal aunque la respuesta canónica incluya colaboradores; **no** se acepta un colaborador suelto.
- **Contexto**: «Bad Bunny feat. Otro» debe poder responderse con «Bad Bunny», que es quien identifica la canción. Aceptar «Otro» a secas daría por buena una respuesta que no la identifica, y con canciones de muchos artistas invitados convertiría el modo en una lotería.
- **Elección**: `primaryArtist` corta por `feat.`, `ft.`, `&`, `,`, `con`, `with`, `vs`, `x` e `y`. Solo la parte de delante entra como forma aceptable, y solo en preguntas de artista: en un título, lo que va tras la coma sigue siendo parte del título.
- **Consecuencias**: la política está en código y en tests, no en la cabeza de nadie.

## 2026-08-08 — Ni el ack ni el intento delatan el acierto

- **Decisión**: enviar una respuesta escrita devuelve si se ha registrado y cuántos intentos quedan, nunca si es correcta. La puntuación se aplica al cerrar la ronda.
- **Contexto**: es el mismo razonamiento que en el quiz. Además, aquí es más grave: con varios intentos, un ack que dijera «incorrecta» convertiría el modo en un juego de adivinar por descarte contra el servidor.
- **Consecuencias**: hay un enfriamiento de 900 ms por jugador además del límite de intentos, para que probar a fuerza bruta durante la ventana no sea viable. Repetir una respuesta ya probada no gasta intento pero tampoco cuela.

## 2026-08-08 — Se guardan todos los intentos, no solo el veredicto

- **Decisión**: cada intento se persiste en `PlayerAnswer` con su número de intento.
- **Contexto**: interesa saber con cuántos intentos se acertó y por qué camino (exacta, normalizada, alias o errata), no solo si se acertó.
- **Consecuencias**: The Show puede contar cuántos aciertos colaron por errata, que es de las cosas que más gracia hacen del modo. Las respuestas equivocadas **no** se enseñan en público: se cuentan, no se exponen.

## 2026-08-08 — Supervivencia no duplica evaluadores: deriva la configuración del modo de ronda

- **Decisión**: al arrancar una sala de Supervivencia, el motor deriva una configuración de quiz o de respuesta libre y la deja en el runtime. A partir de ahí, la generación de preguntas, el envío de respuestas, la persistencia y la puntuación pasan por el mismo código que los modos originales.
- **Contexto**: Supervivencia usa rondas de otro modo. Reimplementarlas habría significado mantener dos veces la parte difícil, que es justamente la generación de distractores y la comparación difusa de respuestas.
- **Alternativas**: un handler con su propio generador y su propio evaluador; copiar el código de ambos modos.
- **Elección**: derivar la configuración. Supervivencia solo aporta lo suyo —vidas, eliminación, espectador y final de partida—, en `survival-rules.ts`, que es lógica pura y por tanto comprobable a fondo.
- **Consecuencias**: arreglar el _fuzzy_ arregla también Supervivencia. El precio es que la configuración derivada fija algunos valores (cuatro opciones, un intento); si en el futuro conviene exponerlos, se añaden a `SurvivalConfig`.

## 2026-08-08 — Las vidas se persisten y nunca las decide el cliente

- **Decisión**: `PlayerLifeState` es una tabla propia. El servidor calcula quién pierde vida y quién queda eliminado a partir de la evaluación que él mismo hizo; el cliente solo manda lo que respondió.
- **Contexto**: las vidas deciden quién sigue jugando. Si vivieran solo en memoria, una reconexión podría devolverlas; si las decidiera el cliente, cualquiera se quedaría con tres vidas para siempre.
- **Consecuencias**: recargar la página no devuelve vidas ni resucita a nadie, y hay un E2E que lo comprueba. El envío de respuestas rechaza en el servidor a quien está eliminado, además de no ofrecerle el botón.

## 2026-08-08 — Las vidas no son puntos

- **Decisión**: las vidas viven fuera de `ScoreEvent` y no se convierten en puntuación.
- **Contexto**: mezclarlas obligaría a inventar una equivalencia («¿cuántos puntos vale una vida?») que no significa nada, y rompería el ranking del resto de modos.
- **Elección**: gana quien queda en pie, no quien más puntos hace. La puntuación sigue existiendo, pero solo como criterio de desempate y para el historial.

## 2026-08-08 — El desempate de Supervivencia es determinista

- **Decisión**: orden fijo —en pie antes que eliminado; entre eliminados, quien aguantó más rondas; luego más vidas, más puntuación, más aciertos y menor tiempo acumulado—.
- **Contexto**: si al agotarse el límite de rondas quedan varias personas vivas, hace falta un ganador. Sin la última regla, dos partidas idénticas quedarían empatadas y el orden dependería del azar del `sort`.
- **Consecuencias**: un test comprueba que ordenar dos veces la misma lista da el mismo resultado.

## 2026-08-08 — No responder cuesta vida, pero es configurable

- **Decisión**: por defecto callarse cuesta una vida; el anfitrión puede desactivarlo.
- **Contexto**: sin coste, la estrategia ganadora es no responder nunca, que vacía el juego. Pero hay grupos donde dudar y quedarse callado no debería castigarse igual que fallar.
- **Consecuencias**: la regla está en `applyRoundOutcome`, no repartida por el motor, y tiene test para las dos configuraciones.

## 2026-08-08 — El modo mixto reparte con resto mayor e intercalado proporcional

- **Decisión**: el reparto de rondas se calcula una vez al empezar, por el método del resto mayor, y luego se intercala eligiendo en cada paso el tipo más atrasado respecto a su cuota.
- **Contexto**: dos problemas distintos. El primero, el redondeo: con cinco rondas, un tipo con el 10 % da 0,5 y desaparecería al truncar. El segundo, el orden: la primera versión tomaba el tipo con más rondas pendientes, y como el reparto equilibrado tiene tres entradas con opciones y solo dos de escribir, **las primeras rondas salían todas de opciones**. Lo destapó un E2E que recorría cuatro rondas y solo encontraba un tipo.
- **Alternativas**: barajar el plan al azar; alternar estrictamente entre tipos.
- **Elección**: resto mayor para las cantidades y reparto proporcional —(usadas + 0,5) / cuota— para el orden. Barajar al azar habría dado rachas igual de malas y, sobre todo, habría dejado de ser determinista.
- **Consecuencias**: el plan es reproducible, así que quien reconecta recibe la misma ronda que el resto. Hay tests para el reparto exacto en partidas largas, para que ningún tipo con peso desaparezca en partidas cortas y para que la variedad aparezca dentro de las cuatro primeras rondas.

## 2026-08-08 — El bingo no entra en el modo mixto

- **Decisión**: mixto combina rondas con opciones y de respuesta libre; el bingo queda fuera y no se anuncia dentro de la mezcla.
- **Contexto**: el bingo se juega sobre un cartón repartido al empezar y validado durante toda la partida. Meterlo como una ronda suelta obligaría a repartir cartones para una sola canción, o a mantener un cartón vivo entre rondas de otro tipo, y a rehacer la validación de marcas para ese caso.
- **Alternativas**: repartir cartón al inicio y usarlo solo en las rondas de bingo; una ronda de bingo con cartón de un solo uso.
- **Elección**: dejarlo fuera, decirlo en la interfaz y documentarlo como trabajo futuro. La spec ya contemplaba esta salida: es mejor no anunciarlo que anunciarlo a medias.
- **Consecuencias**: el dominio no lo impide —`MixedRoundDefinition` puede ganar un `kind` nuevo—, pero hoy no existe y la interfaz lo dice explícitamente.

## 2026-08-08 — El resumen entre rondas se generaliza, no se duplica

- **Decisión**: `RoundSummary` sigue siendo un solo componente con la misma estructura en todos los modos; lo que cambia es el titular y una línea extra cuando el modo tiene algo propio que contar.
- **Contexto**: la alternativa era un componente por modo. Habría multiplicado por cinco un bloque que en el 80 % dice lo mismo —quién fue más rápido, rachas, quién sube en la clasificación— y habría hecho que arreglar un detalle exigiera arreglarlo cinco veces.
- **Consecuencias**: en bingo se «tiene» la canción en el cartón; en los modos que preguntan se «acierta»; supervivencia añade quién ha caído y cuántos quedan; la respuesta libre añade cuántos colaron por errata.

## 2026-08-08 — El recuento de aciertos depende del modo

- **Decisión**: `correctCount` sale de las respuestas en los modos que preguntan y de las marcas de cartón solo en bingo.
- **Contexto**: se contaba siempre con `playerMark.count`, que en quiz, adivina, supervivencia y mixto es cero. El resumen decía «no la tenía nadie» en todas las rondas de todos los modos nuevos, aunque las hubiera acertado todo el mundo.
- **Consecuencias**: de paso, `totalPlayers` pasa a contar jugadores y no participantes: el anfitrión y la pantalla de proyección no responden, y contarlos falseaba el «N de M».

## 2026-08-08 — La revancha duplica la partida en lugar de reabrir la sala

- **Decisión**: `POST /rooms/:code/rematch` crea una partida gemela —mismo modo, misma configuración, misma colección y mismas reglas— y una sala nueva.
- **Contexto**: reabrir la sala anterior habría sobrescrito sus rondas, su ranking y su resultado. El historial de una partida terminada tiene que quedarse como está.
- **Alternativas**: reutilizar la sala; crear una sala nueva sobre la misma partida.
- **Elección**: duplicar. Crear otra sala sobre la misma partida habría mezclado los resultados de las dos en el historial de esa partida.
- **Consecuencias**: solo el anfitrión puede convocarla, y la sala nueva empieza en su lobby, así que pueden entrar jugadores distintos. La partida anterior sigue consultable.

## 2026-08-11 — El fallo intermitente de los E2E no era aleatorio

- **Decisión**: el helper de sesión compartida valida la sesión con un dato que solo llega con sesión válida, y las pruebas que la invalidan a propósito lo dicen explícitamente.
- **Contexto**: desde antes de esta épica, la suite completa fallaba con un test distinto en cada ejecución mientras que cada test pasaba aislado. La primera hipótesis —agotar el _rate limiting_— resultó **falsa**: una ejecución completa no produjo ni un solo 429.
- **Causa real**: las pruebas comparten una sesión para no agotar el límite de accesos. El helper la daba por buena si, tras ir a `/dashboard`, la URL seguía siendo `/dashboard` y existía el enlace «Tu cuenta». Pero el middleware solo comprueba que la cookie **exista**, no que siga viva, y ese enlace se renderiza antes de resolver la sesión. Con la cookie revocada —por el propio test de cierre de sesión, o por el de cerrar las demás sesiones— el helper devolvía «sesión válida», la página se iba a `/login` un instante después y la prueba fallaba más adelante, en una navegación cualquiera. Cuál fallaba dependía del orden y de los tiempos, que es lo que la hacía parecer aleatoria.
- **Elección**: esperar al nombre de la cuenta, que solo aparece cuando el servidor ha confirmado la sesión, y exponer `olvidarSesionCompartida()` para que las pruebas que la matan no dejen la caché mintiendo.
- **Consecuencias**: no se ha tocado el límite de accesos, que es una protección real y sigue probada. El arreglo es de las pruebas, que era donde estaba el fallo.

## 2026-08-11 — La imagen de Docker no se construía fuera de un checkout limpio

- **Decisión**: añadir `.dockerignore` y copiar el esquema de Prisma antes de instalar en la imagen de la API.
- **Contexto**: `docker compose --profile full build` era lo único de la validación final que nunca se había ejecutado en esta épica. Fallaba, y **también fallaba en `main`**: no es una regresión.
- **Causa 1**: no existía `.dockerignore`. El contexto arrastraba los `node_modules` del host —enlaces simbólicos de pnpm que apuntan a rutas del host— y el `COPY` de cada app los dejaba caer encima de los que el contenedor acababa de instalar. Los enlaces dejaban de resolver y la construcción moría con un `Cannot find module .../next`, que parece un problema de dependencias y no lo es. La imagen solo se construía en un checkout sin `node_modules`, es decir, en CI.
- **Causa 2**: el `postinstall` de `@bingo/database` ejecuta `prisma generate`, que necesita el esquema; el Dockerfile solo copiaba los `package.json` antes de instalar. Estaba oculto tras una capa cacheada y salió a la luz al invalidarse la caché.
- **Consecuencias**: ambas imágenes se construyen ya en local (`bingo-web` 1,33 GB, `bingo-api` 892 MB). De paso, el contexto de construcción es mucho más pequeño.
