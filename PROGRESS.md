# Progreso

- **Estado**: MVP local completo y jugable con identidad visual propia, publicado como `v0.3.1`.
- **Épica actual**: ninguna — release cerrada con CI y E2E en verde.
- **Rama actual**: `main`.

## Funcionalidades terminadas

| Épica            | Contenido                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------ |
| Foundation       | Monorepo pnpm + Turborepo, TS estricto, ESLint, Prettier, Husky, commitlint, Docker, CI    |
| Database         | 27 modelos Prisma, migraciones, seed con usuario demo, 20 pistas e historial               |
| Authentication   | Registro, login, logout, Argon2id, cookies HttpOnly, rutas protegidas, dashboard           |
| Music catalog    | Colección demo con audio generado, reproductor de previews                                 |
| Games and rooms  | Wizard de partida, códigos de 6 caracteres, QR, lobby, invitados con token firmado         |
| Bingo cards      | Generación determinista en servidor 3×3/4×4/5×5, centro libre, sin duplicados              |
| Realtime engine  | Socket.IO + Redis adapter, contratos tipados, presencia, reconexión                        |
| Gameplay         | Máquina de estados de ronda, precarga y reproducción sincronizada, controles del anfitrión |
| Scoring          | Marcas validadas en servidor, bonus de velocidad y racha, línea, bingo, ranking en vivo    |
| Results          | Highlights, ceremonia de podio con confeti, historial y duplicado de partidas              |
| Spotify          | Búsqueda, importación de playlists, `PreviewProvider` encapsulado con caché y reintentos   |
| UX polish        | Iconos lucide (sin emojis), revelado y avance automáticos configurables, animaciones       |
| OAuth y sesiones | Inicio de sesión con Google, renovación deslizante, cierre de otros dispositivos           |
| PWA              | Manifest, service worker, iconos generados, aviso de instalación, página offline           |
| Quality          | 71 tests unitarios, 12 E2E con Playwright, CI en GitHub Actions, documentación             |
| Visual identity  | Sistema de funda de disco: papel y tinta, tipografía propia, el disco indica la ronda      |
| Stitch           | Código de sala en casillas, escaneo del QR, contrato del código en `@bingo/shared`         |
| Game rules       | Fallo recuperable entre rondas, confirmación propia al terminar, sonda de partida real     |

## Validaciones ejecutadas

| Comprobación     | Resultado                                                      |
| ---------------- | -------------------------------------------------------------- |
| `pnpm lint`      | 8/8 paquetes sin errores                                       |
| `pnpm typecheck` | 8/8 paquetes sin errores                                       |
| `pnpm test`      | 71 tests en 7 archivos (shared 34, music-providers 24, api 13) |
| `pnpm build`     | 5/5 paquetes compilados                                        |
| `pnpm test:e2e`  | 14 tests Playwright en verde, con Spotify configurado          |
| Docker           | `bingo-postgres` y `bingo-redis` en estado `Up (healthy)`      |
| Migraciones      | 3 migraciones aplicadas correctamente                          |
| GitHub Actions   | Workflows `CI` y `E2E` en verde en `main`                      |

Los E2E y `pnpm dev` se han verificado además partiendo de `packages/shared/dist`
borrado, que es el estado de un checkout limpio como el de CI.

## Funcionalidades aplazadas

- Modo híbrido (el modelo lo contempla, la lógica no está implementada).
- Reclamaciones por columna, diagonal y patrones libres (solo fila y cartón completo).
- Verificación de correo y recuperación de contraseña reales.
- Reordenar y eliminar canciones dentro de una colección importada.
- Restauración del estado de una partida en curso si se reinicia la API (la sala queda pausada).
- Highlight de mayor remontada (el tipo existe, no se calcula).

## Errores conocidos

- Al reiniciar la API con una partida en curso, la sala pierde el runtime en memoria y hay que crear otra sala; el historial anterior se conserva.
- El aviso de instalación de la PWA solo aparece en navegadores Chromium; en iOS hay que usar «Añadir a pantalla de inicio».

## Próximo bloque recomendado

1. Épica 2: colecciones y Spotify (importar listas enteras, gestionarlas, crear
   listas canción a canción y colecciones temáticas propias).
2. Persistir el runtime de la partida en Redis para sobrevivir a reinicios.
3. Patrones de línea configurables (columnas y diagonales).
4. Modo oscuro «laca» revisado pantalla a pantalla, que es lo que sugería Stitch
   como siguiente variante.

## Último commit relevante

`chore(release): integrate epic/game-rules`
