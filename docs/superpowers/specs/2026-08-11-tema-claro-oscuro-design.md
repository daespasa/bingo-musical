# Tema claro y oscuro configurable

**Fecha**: 2026-08-11
**Estado**: aprobado, pendiente de plan
**Ámbito**: `apps/web` (Tailwind, `globals.css`, layout, preferencias)

## Problema

El tema lo decide el sistema operativo y no hay forma de cambiarlo:
`tailwind.config.ts` usa `darkMode: 'media'` y `globals.css` define los colores
oscuros dentro de dos bloques `@media (prefers-color-scheme: dark)`
(`globals.css:11` y `:36`).

Esto duele especialmente en el caso de uso real de Gramola: un salón, un
proyector y móviles ajenos. El anfitrión no puede forzar el tema oscuro para
proyectar, ni el claro si la sala está iluminada, sin ir a los ajustes de su
sistema.

## Decisión

Selector de tres estados —**Claro / Oscuro / Automático**— con «Automático»
por defecto, que es exactamente el comportamiento de hoy.

La preferencia se guarda en `localStorage`, no en el perfil de usuario. Razón:
la mitad de quien usa Gramola juega sin cuenta, y el tema es una preferencia
del dispositivo, no de la persona: el mismo anfitrión quiere oscuro en el
portátil que proyecta y automático en su móvil.

## Cambios

### 1. Tailwind y CSS pasan a clase

- `tailwind.config.ts`: `darkMode: 'media'` → `darkMode: 'class'`.
- `globals.css`: los dos bloques `@media (prefers-color-scheme: dark)` pasan a
  `.dark { … }`.

Las 34 pantallas y componentes que usan variantes `dark:` no se tocan: cambia
quién enciende la clase, no las variantes.

### 2. El modo automático se resuelve en JavaScript

Con `darkMode: 'class'`, «Automático» deja de ser gratis: hay que leer
`prefers-color-scheme` y poner o quitar la clase, además de escuchar el evento
`change` del `matchMedia` para que un cambio de tema del sistema se refleje sin
recargar.

`color-scheme: light dark` de `:root` (`globals.css:6`) pasa a seguir al tema
elegido, para que los controles nativos —selectores, barras de scroll— no se
queden en el tema contrario.

### 3. Script anti-parpadeo

Un script inline en el `<head>` del layout, antes de pintar, que lee
`localStorage` y aplica la clase. Sin él, cualquiera con el tema oscuro
guardado ve un fogonazo blanco en cada carga.

Va inline y sin dependencias a propósito: es el único código que debe correr
antes de la hidratación. Es el punto donde con más facilidad se cuela un
desajuste de hidratación, así que la clase se aplica sobre `<html>` y ningún
componente renderiza el tema activo en el primer paso.

### 4. Control de tema

Un `ThemeToggle` de tres estados, colocado:

- En el menú de usuario, para quien tiene cuenta.
- En la portada, junto a «Acceder», para quien todavía no ha entrado.

Con `aria-label` y estado marcado; anuncia el tema activo, no solo el icono.

## Qué no se toca

- La paleta. Los colores oscuros que ya existen se mantienen tal cual: esto es
  fontanería de conmutación, no un rediseño.
- El proyector, que hereda el tema como cualquier otra pantalla.

## Pruebas

- Unitaria de la resolución del tema: para cada preferencia guardada y cada
  valor de `prefers-color-scheme`, la clase que debe quedar en `<html>`.
- E2E: elegir «Oscuro», recargar y comprobar que `<html>` conserva la clase y
  que no hay fogonazo (la clase está presente ya en el primer pintado).
- E2E: con «Automático», emular `prefers-color-scheme: dark` y comprobar que la
  clase cambia sin recargar.

## Riesgos

- **Desajuste de hidratación**: es el fallo típico de este patrón. Ningún
  componente debe renderizar contenido distinto según el tema en el primer
  render; el toggle muestra su estado solo después de montarse.
- `DESIGN.md` manda sobre la paleta: si documenta el tema como automático, hay
  que actualizarlo en el mismo cambio.
- El `theme-color` del layout (`layout.tsx`) tiene dos entradas por
  `prefers-color-scheme`. Con tema forzado dejará de coincidir con la interfaz
  en la barra del navegador; es un detalle menor y aceptado, pero conviene
  anotarlo en `DECISIONS.md` en lugar de descubrirlo dos meses después.
