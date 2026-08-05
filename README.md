# Bingo Musical 🎵

Bingo musical en tiempo real inspirado en la dinámica de Kahoot: un anfitrión crea una partida, los jugadores entran con un código o QR, reciben cartones musicales distintos y marcan canciones mientras suenan fragmentos de 15 segundos. Líneas, bingos, ranking en vivo y ceremonia de premios.

> Estado: MVP local en desarrollo. Ver [PROGRESS.md](PROGRESS.md).

## Stack

- **Monorepo**: pnpm workspaces + Turborepo + TypeScript estricto
- **Frontend**: Next.js (App Router) + Tailwind CSS + Socket.IO Client
- **Backend**: NestJS + REST + Socket.IO + Prisma + Argon2
- **Datos**: PostgreSQL + Redis (Docker Compose)

## Inicio rápido

```bash
corepack enable && corepack prepare pnpm@9.15.4 --activate
pnpm install
cp .env.example .env
docker compose up -d bingo-postgres bingo-redis
pnpm db:migrate
pnpm db:seed
pnpm demo:audio   # genera las pistas demo (WAV libres de derechos)
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3001
- Swagger: http://localhost:3001/docs

Usuario demo: `demo@bingo.local` / `Demo1234!`

Documentación completa de instalación y pruebas más abajo (se completa junto al MVP).
