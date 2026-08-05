# Contribuir

## Instalación

```bash
corepack enable && corepack prepare pnpm@9.15.4 --activate
pnpm install
cp .env.example .env   # y rellena secretos aleatorios
docker compose up -d bingo-postgres bingo-redis
pnpm db:migrate && pnpm db:seed && pnpm demo:audio
pnpm dev
```

## Estrategia de ramas

- `main`: única rama permanente. Solo recibe épicas completas mediante `git merge --no-ff epic/<nombre>`.
- `epic/<nombre>`: una rama por épica (foundation, database, authentication, music-catalog, game-rooms, bingo-cards, realtime-engine, gameplay, scoring, results, spotify, quality).
- `feat/`, `chore/`, `test/`, `fix/`: ramas de implementación cortas creadas desde su épica; se integran en la épica con merge normal.
- Prohibido force push sobre `main`.

## Conventional Commits

Formato: `type(scope): descripción en imperativo`.

Tipos: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `style`, `perf`, `build`, `ci`, `revert`.

Un commit = una intención. No mezclar refactors con features ni formateo masivo con lógica. commitlint lo valida en el hook `commit-msg`.

## Validaciones antes de commit

Los hooks de Husky ejecutan automáticamente:

- `pre-commit`: Prettier + ESLint sobre los archivos staged (lint-staged).
- `commit-msg`: commitlint.
- `pre-push`: `pnpm typecheck && pnpm test`.

Ejecuta manualmente antes de abrir PR: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

## Pull requests

Cada épica se integra en `main` mediante PR (cuando `gh` está disponible) con: resumen, cambios, cómo probar, tests ejecutados y riesgos.

## Issues

Usa etiquetas: `epic`, `feature`, `bug`, `infrastructure`, `frontend`, `backend`, `realtime`, `music`, `testing`, `documentation`.
