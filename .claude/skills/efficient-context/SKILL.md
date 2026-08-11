---
name: efficient-context
description: Investiga, depura o modifica este repositorio usando el mínimo contexto necesario. Úsala en tareas de código con varios archivos, búsquedas de arquitectura, diagnóstico de errores o cuando el usuario pida ahorrar tokens.
---

# Contexto eficiente

## Flujo

1. Delimita el resultado y el área probable antes de leer código.
2. Consulta el mapa corto de `CLAUDE.md`; abre una referencia solo si la tarea la necesita.
3. Descubre con `rg --files` y `rg -n`. Lee rangos pequeños alrededor de cada coincidencia.
4. Sigue símbolos e imports desde el punto de entrada; evita inventariar todo el monorepo.
5. Detén la exploración cuando haya evidencia suficiente para actuar.
6. Edita el conjunto mínimo de archivos y revisa solo el diff relevante.

## Presupuesto de contexto

- No vuelques archivos completos si basta un rango; amplía de forma incremental.
- No cargues `node_modules`, `.next`, `dist`, `.turbo`, cobertura, reportes, lockfiles ni código generado.
- No releas un archivo sin motivo después de editarlo; usa el diff para confirmar.
- Resume resultados de comandos ruidosos con filtros, nombres de archivo o líneas relevantes.
- Prefiere ejecutar scripts existentes como caja negra antes que leer su implementación.
- Mantén planes y actualizaciones breves. Informa decisiones, bloqueos y resultados; omite operaciones rutinarias.

## Límites

- No sacrifiques corrección por brevedad: amplía contexto cuando contratos, seguridad o efectos laterales no estén claros.
- No leas `.env` ni expongas secretos. Usa `.env.example` para conocer nombres de variables.
- Conserva cambios ajenos y evita formateos masivos.
