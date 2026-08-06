# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [SemVer](https://semver.org/lang/es/).

## [0.1.1] - 2026-08-06

### Fixed

- `@bingo/shared` se compila antes de arrancar los servidores de desarrollo: la tarea `dev` de Turborepo depende de `^build`, el paquete pierde su script `dev` (el `tsc --watch` reescribía `dist` mientras la API arrancaba y dejaba a `ts-node-dev` reiniciando sin escuchar) y el `webServer` de Playwright lo construye porque no pasa por Turborepo. Con esto los E2E vuelven a pasar en un checkout limpio, que era el fallo del workflow E2E.

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
