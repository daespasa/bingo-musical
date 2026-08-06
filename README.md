# Bingo Musical 🎵

Bingo musical en tiempo real inspirado en la dinámica de Kahoot: un anfitrión crea una partida, los jugadores entran con un código o QR, reciben cartones musicales distintos y marcan canciones mientras suenan fragmentos de 15 segundos. Líneas, bingos, ranking en vivo y ceremonia de premios.

**Versión actual: v0.1.0** — MVP local jugable. Ver [PROGRESS.md](PROGRESS.md) y [CHANGELOG.md](CHANGELOG.md).

---

## Requisitos

- Node.js 20 o superior
- Docker y Docker Compose (para PostgreSQL y Redis)
- pnpm 9 (se instala con corepack, incluido en Node)

No hace falta ninguna cuenta ni servicio de pago: la aplicación es jugable de principio a fin con la colección de música demo incluida.

## Instalación y primer arranque

```bash
# 1. Dependencias
corepack enable && corepack prepare pnpm@9.15.4 --activate
pnpm install

# 2. Variables de entorno (rellena los dos secretos con valores aleatorios)
cp .env.example .env
sed -i "s/replace-with-a-long-random-secret/$(openssl rand -hex 32)/" .env
sed -i "s/replace-with-another-long-random-secret/$(openssl rand -hex 32)/" .env

# 3. Base de datos y caché
docker compose up -d bingo-postgres bingo-redis

# 4. Esquema, datos demo y assets generados (audio + iconos)
pnpm db:migrate
pnpm db:seed
pnpm demo:assets

# 5. Arrancar web y API
pnpm dev
```

| Servicio   | URL                            |
| ---------- | ------------------------------ |
| Web        | http://localhost:3000          |
| API        | http://localhost:3001          |
| Swagger    | http://localhost:3001/docs     |
| PostgreSQL | localhost:5432 (`bingo/bingo`) |
| Redis      | localhost:6379                 |

**Usuario demo:** `demo@bingo.local` / `Demo1234!`

## Cómo probar una partida con dos jugadores

1. Abre http://localhost:3000/login e inicia sesión con el usuario demo.
2. Pulsa **Nueva partida**, ponle nombre, elige la **Colección Demo** y crea la partida.
   - Para probar rápido, baja el fragmento a 10 s y la ventana de respuesta a 5 s.
   - En **Ritmo de la partida** decides si la canción se revela sola al acabar la ronda o si prefieres revelarla tú.
3. Pulsa **Abrir sala (modo remoto)**. Verás el código de 6 caracteres y su QR.
4. Abre **dos ventanas de incógnito** (o dos móviles en la misma red) en `http://localhost:3000/join/CODIGO`.
5. En cada una escribe un alias distinto y entra. Los alias son únicos por sala.
6. En cada ventana pulsa **Activar sonido** (el navegador exige un gesto para reproducir audio).
7. En el panel del anfitrión pulsa **Empezar partida**.
8. Cada jugador recibe un cartón **distinto**, generado en el servidor. Suena el fragmento y se marcan las casillas: el servidor valida cada marca, el navegador nunca decide.
9. Prueba los controles del anfitrión: pausar, reanudar, repetir fragmento, +10 s, revelar, omitir y siguiente.
10. Canta **¡Línea!** o **¡Bingo!**: si no la tienes, el servidor rechaza la reclamación y penaliza.
11. Pulsa **Finalizar** para ver la ceremonia de podio, los momentazos y la clasificación final.

Para el **modo proyector**, abre la sala con ese modo y usa `Abrir pantalla proyector`: el audio suena solo ahí y los móviles muestran únicamente el cartón.

## Comandos

```bash
pnpm dev              # web (3000) + API (3001) en paralelo
pnpm build            # build de producción de todos los paquetes
pnpm lint             # ESLint en todo el monorepo
pnpm typecheck        # TypeScript estricto
pnpm test             # tests unitarios (Vitest)
pnpm test:e2e         # tests end-to-end (Playwright, arranca los servidores)
pnpm db:migrate       # aplica migraciones en desarrollo
pnpm db:deploy        # aplica migraciones en despliegue
pnpm db:seed          # datos demo
pnpm demo:assets      # genera audio demo e iconos de la PWA
pnpm format           # Prettier
```

`pnpm dev` compila antes `packages/shared`, que la API y la web consumen desde
`dist`. Ese paquete no tiene watcher: si lo modificas, reinicia `pnpm dev` o
ejecuta `pnpm --filter @bingo/shared build`.

## Arquitectura

```
apps/
  web/    Next.js 15 (App Router), Tailwind, TanStack Query, Socket.IO client, PWA
  api/    NestJS 11, REST + Swagger, Socket.IO + Redis adapter, Prisma, Argon2id
packages/
  shared/           contratos WebSocket, generación de cartones, puntuación, normalización
  database/         esquema Prisma, migraciones y seed
  music-providers/  contrato PreviewProvider y encapsulado de spotify-preview-finder
docker/             Dockerfiles de api y web
e2e/                tests Playwright
scripts/            generadores de audio demo e iconos
```

El audio nunca pasa por la API: el navegador reproduce la URL del proveedor y se detiene a los 15 segundos. Solo se guardan metadatos y la URL.

## Instalar como aplicación (PWA)

La web es instalable. En Chrome o Edge aparece un aviso «Instalar Bingo Musical» (o el icono de instalación en la barra de direcciones). En iOS: **Compartir → Añadir a pantalla de inicio**.

El service worker cachea la interfaz y los fragmentos de audio demo, pero **nunca** respuestas de la API ni del WebSocket: el estado de la partida siempre viene del servidor.

## Música de Spotify (opcional)

Sin credenciales la aplicación funciona con la colección demo (20 pistas sintetizadas libres de derechos, generadas por `pnpm demo:assets`). Para activar búsqueda e importación de playlists:

1. Crea una aplicación en el [panel de desarrolladores de Spotify](https://developer.spotify.com/dashboard).
2. Copia el Client ID y el Client Secret en tu `.env`:

   ```env
   SPOTIFY_CLIENT_ID=tu-client-id
   SPOTIFY_CLIENT_SECRET=tu-client-secret
   ```

3. Reinicia la API. En **Dashboard → Música** podrás buscar canciones e importar playlists públicas.

Las credenciales solo se usan en el backend. Las previews se resuelven con `spotify-preview-finder`, encapsulado tras la interfaz `PreviewProvider` (timeout, caché, reintentos con backoff, concurrencia máxima de 2 y validación de que la URL viene del CDN de Spotify). Se trata como proveedor experimental y sustituible.

## Inicio de sesión con Google (opcional)

1. En [Google Cloud Console → Credenciales](https://console.cloud.google.com/apis/credentials) crea un **ID de cliente de OAuth 2.0** de tipo aplicación web.
2. Añade como URI de redirección autorizado: `http://localhost:3001/auth/google/callback`
   (en producción: `https://bingo.daespasa.com/api/auth/google/callback`).
3. Copia las credenciales en tu `.env`:

   ```env
   GOOGLE_CLIENT_ID=tu-client-id
   GOOGLE_CLIENT_SECRET=tu-client-secret
   ```

Si no las configuras, el botón simplemente no aparece y el acceso con correo y contraseña sigue funcionando. Si un correo ya tiene cuenta local, al entrar con Google se vincula a la misma cuenta.

## Docker

PostgreSQL y Redis son los únicos servicios necesarios en desarrollo:

```bash
docker compose up -d bingo-postgres bingo-redis
```

Para levantar también las imágenes de web y API:

```bash
docker compose --profile full up -d --build
```

Los datos viven en volúmenes nombrados (`bingo-pgdata`, `bingo-redisdata`) y sobreviven a `docker compose down`. **No uses `docker compose down -v`** salvo que quieras borrarlos.

## Despliegue en bingo.daespasa.com

La arquitectura ya está preparada para ejecutarse tras Cloudflare Tunnel (la API activa `trust proxy` y cookies `Secure` en producción). Pasos previstos en el mini-PC con CasaOS:

1. Clona el repositorio y crea el `.env` de producción con secretos nuevos, `NODE_ENV=production`, `WEB_URL=https://bingo.daespasa.com`, `API_URL=https://bingo.daespasa.com/api` y `NEXT_PUBLIC_*` apuntando al mismo dominio.
2. `docker compose --profile full up -d --build` y `pnpm db:deploy` (o deja que el contenedor de la API aplique las migraciones al arrancar).
3. En Cloudflare Zero Trust crea un túnel con dos rutas hacia el host: `/` → `bingo-web:3000` y `/api` + `/socket.io` → `bingo-api:3001` (el WebSocket necesita su ruta propia).
4. En Cloudflare DNS, el registro `bingo` apunta al túnel.
5. Actualiza el URI de redirección de Google al dominio real.

## Seguridad

Contraseñas con Argon2id, cookies HttpOnly con renovación deslizante, tokens de invitado firmados y ligados a una sala, validación de toda marca y reclamación en servidor, rate limiting y CORS restringido. Ver [SECURITY.md](SECURITY.md).

## Contribuir

Ramas cortas por épica, Conventional Commits y validaciones antes de cada commit. Ver [CONTRIBUTING.md](CONTRIBUTING.md).

## Licencia

Uso personal. La música demo se genera localmente y es libre de derechos; el proyecto no incluye ni descarga música comercial.
