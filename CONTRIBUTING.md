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

## Variables de entorno y Turborepo

Turborepo 2 ejecuta las tareas en **modo de entorno estricto**: una tarea solo
recibe las variables declaradas en su clave `env` de `turbo.json` (más
`globalEnv`). Si añades una variable nueva que necesite `dev`, `build` o `test`,
decláralas ahí o la tarea la verá como `undefined`.

Los tests unitarios son herméticos: `apps/api/vitest.setup.ts` fija valores
deterministas y deja Spotify y Google sin configurar, de modo que no dependen
de que exista un `.env` en disco ni de credenciales reales.

## El paquete `@bingo/shared` se consume compilado

La API y la web importan `@bingo/shared` desde `dist`, no desde `src`. Por eso
la tarea `dev` de `turbo.json` declara `dependsOn: ["^build"]`: en un checkout
limpio Turborepo compila el paquete antes de arrancar los servidores. El
paquete **no tiene script `dev`**: un `tsc --watch` reescribía `dist` mientras
la API arrancaba y `ts-node-dev` se quedaba reiniciando sin llegar a escuchar.

Si tocas `packages/shared`, recompílalo (`pnpm --filter @bingo/shared build`)
o reinicia `pnpm dev` para que la API vea los cambios.

Por el mismo motivo, el `webServer` de Playwright construye el paquete antes de
levantar la API: sus comandos usan `pnpm --filter` directo y no pasan por
Turborepo.

**No declares `"type": "commonjs"` en `packages/shared/package.json.`** Sin ese
campo Node ya trata los `.js` como CommonJS, que es lo que necesita la API,
pero con él webpack marca el paquete como CommonJS explícito y el servidor de
desarrollo de Next falla al inyectar su recarga en caliente
(`Cannot use 'import.meta' outside a module`) en cuanto la web importa del
paquete algo que no sea un tipo. Durante mucho tiempo no se notó porque todas
las importaciones desde la web eran `import type`, que desaparecen al compilar.

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
