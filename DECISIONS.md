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
