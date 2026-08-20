# Gramola

Monorepo pnpm/Turborepo: Next.js 15 en `apps/web`, NestJS 11 en `apps/api`, Prisma en `packages/database` y contratos compartidos en `packages/shared`.

## Cómo trabajar

- Responde en español y de forma concisa. No repitas el encargo ni narres búsquedas rutinarias.
- Empieza por `CLAUDE.md`; carga solo los archivos que afecten a la tarea. Usa `rg` y lecturas por rangos antes de abrir documentos o árboles completos.
- No leas `.env`, artefactos generados (`dist`, `.next`, `.turbo`, coberturas) ni lockfiles salvo necesidad explícita.
- Conserva cambios ajenos. Antes de editar, revisa `git status --short`; después, revisa el diff propio.
- Reutiliza patrones y dependencias existentes. No añadas paquetes ni reestructures áreas no solicitadas sin una razón concreta.
- Para investigaciones o cambios amplios, aplica la skill `efficient-context`.
- Para cualquier cambio visual en `apps/web`, aplica `gramola-design-taste`; `DESIGN.md` prevalece sobre preferencias genéricas.
- Antes de entregar cambios de código, aplica `verify-gramola` y ejecuta la validación mínima relevante.

## Referencias bajo demanda

- Producto, arranque y arquitectura general: `README.md`.
- Sistema visual y accesibilidad: `DESIGN.md`.
- Git, entorno, paquete shared y validaciones: `CONTRIBUTING.md`.
- Riesgos y límites de seguridad: `SECURITY.md`.
- Estado y trabajo pendiente: `PROGRESS.md`; historial: `CHANGELOG.md`.

## Restricciones importantes

- `@bingo/shared` y `@bingo/database` se consumen desde `dist`: si cambian, ejecuta `pnpm --filter <paquete> build` o reinicia `pnpm dev`.
- Turborepo usa entorno estricto: declara variables nuevas en `turbo.json`.
- No ejecutes `docker compose down -v`; elimina volúmenes y datos locales.
- No incluyas música comercial, secretos ni archivos `.env` en commits.
