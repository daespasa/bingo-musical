---
name: verify-gramola
description: Selecciona y ejecuta la validación mínima suficiente para cambios en Gramola. Úsala después de modificar código, configuración, Prisma, contratos compartidos o UI, y al diagnosticar fallos de tests o build.
---

# Verificar Gramola

## Selección

Empieza por la comprobación más cercana al cambio y amplía solo si falla o si cruza límites entre paquetes.

- Solo documentación o skills: revisa diff y formato; no ejecutes la suite de aplicación.
- Un paquete: `pnpm --filter <paquete> typecheck`, su `test` si existe y su `lint`.
- `packages/shared`: ejecuta primero `pnpm --filter @bingo/shared build`; valida también cada consumidor afectado.
- API o lógica de dominio: ejecuta el test Vitest específico si se puede identificar; después typecheck del API.
- UI sin flujo completo: typecheck y lint de `@bingo/web`; inspección visual si cambia presentación.
- Flujo de usuario: ejecuta el spec concreto con `pnpm exec playwright test e2e/<spec>.spec.ts`.
- Prisma: genera/valida el cliente y prueba los consumidores afectados; no crees ni apliques migraciones destructivas sin petición explícita.
- Configuración transversal o antes de PR: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

## Reglas

- No ejecutes E2E si PostgreSQL/Redis no están disponibles; informa el requisito en vez de ocultar el fallo.
- Las sondas `*.probe.spec.ts` solo se ejecutan manualmente con `PW_PROBE=1`; no cuentan como tests de aceptación.
- No actualices snapshots, ignores, expectativas ni fixtures solo para silenciar un fallo sin demostrar que el comportamiento nuevo es correcto.
- Registra qué comandos se ejecutaron, su resultado y cualquier validación omitida con motivo.
- Evita repetir suites que Turborepo ya haya servido desde caché salvo que la tarea exija ejecución real.
