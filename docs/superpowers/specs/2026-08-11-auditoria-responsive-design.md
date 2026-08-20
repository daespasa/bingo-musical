# Auditoría responsive

**Fecha**: 2026-08-11
**Estado**: aprobado, pendiente de plan
**Ámbito**: `apps/web` (todas las pantallas), `playwright.config.ts`

## Problema

Gramola se juega desde el móvil —esa es la premisa del producto— y **ninguna
prueba se ejecuta en un viewport móvil**: `playwright.config.ts:29` define un
solo proyecto, `Desktop Chrome`. Las reglas de `DESIGN.md` (44 px de objetivo
táctil, botones a ancho completo por debajo de 640 px) no las verifica nadie.

Que se cumplan hoy sería suerte, no diseño. Y aunque se cumplan hoy, nada
impide que el siguiente cambio las rompa sin que salte ningún test.

## Decisión

Este spec es distinto de los otros seis: primero **medir**, luego arreglar. No
se puede escribir por adelantado la lista de arreglos de una auditoría que
todavía no se ha hecho.

Va el último de los siete, para auditar las pantallas ya con los cambios de los
otros specs dentro y no auditar dos veces lo mismo.

## Fase 1 — Red de seguridad

Antes de tocar una sola clase de Tailwind, que el móvil deje de ser invisible
para la suite:

- Segundo proyecto en Playwright, `mobile`, con `devices['Pixel 7']` (~412 px)
  para gameplay, join y dashboard. No se duplica la suite entera: solo los
  recorridos que de verdad se hacen desde el móvil.
- Un test de invariantes que recorra cada pantalla en 360 px y compruebe:
  - Sin scroll horizontal: `document.scrollWidth <= clientWidth`.
  - Todo control interactivo visible mide al menos 44×44 px.
  - Ningún texto se sale de su contenedor.

Ese test es el que convierte la auditoría en algo repetible.

## Fase 2 — Inventario

Pantallas a revisar, en tres anchos —360, 412 y 768— y en horizontal, que es
como acaba medio salón con el móvil en la mano:

| Zona      | Pantallas                                                                  |
| --------- | -------------------------------------------------------------------------- |
| Público   | portada, login, registro, join, join/[code]                                |
| Dashboard | inicio, historial, música, colecciones/[id], perfil, games/new, games/[id] |
| Partida   | play, host, screen, results                                                |

Sospechosos conocidos, por lo visto al escribir los otros specs:

- `dashboard/games/new`: formulario de 662 líneas con retículas `sm:grid-cols-2`
  y filas de botones `flex-1`; es el candidato número uno a desbordar en 360 px.
- Cartón de bingo 5×5 en 360 px, y peor aún con portadas (ver el spec de
  portadas).
- Quiz con cuatro opciones a dos líneas más el reproductor (ver el spec del
  artista en las opciones).
- Tablas de ranking e historial: es donde más fácil aparece scroll horizontal.
- El proyector, que es el caso contrario: hay que comprobar que no se rompe en
  pantallas muy anchas.

## Fase 3 — Arreglos

Los hallazgos se agrupan por causa, no por pantalla: normalmente una misma
clase mal puesta produce el mismo síntoma en cinco sitios. Cada grupo, su
commit.

Se arregla lo que rompe: desbordes, controles pequeños, texto ilegible,
solapamientos. **No es una ronda de rediseño**: si una pantalla funciona pero
podría ser más bonita, se anota y se queda fuera.

## Entregable

Además del código, una tabla de hallazgos en el propio `PROGRESS.md`: pantalla,
ancho, síntoma, arreglo. Sirve para saber qué se miró de verdad y qué no.

## Riesgos

- **Alcance sin fondo.** El límite escrito arriba —se arregla lo que rompe— es
  lo que impide que esto se convierta en un rediseño de tres semanas.
- Duplicar la suite en móvil alarga el tiempo de CI. De ahí que el proyecto
  `mobile` cubra solo los recorridos móviles de verdad.
- La suite E2E completa ya tiene inestabilidad conocida, anterior a esta épica
  (`PROGRESS.md`). Conviene no confundir un fallo de esa inestabilidad con un
  hallazgo de responsive: los tests nuevos deben poder correrse aislados.
