# Tema claro y oscuro configurable — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-08-11-tema-claro-oscuro-design.md` (vive en la rama
`fix/config-por-modo`; todo lo necesario está copiado aquí).

**Goal:** Que se pueda elegir tema claro, oscuro o automático desde la propia aplicación,
en vez de depender de los ajustes del sistema operativo. El caso real es un salón con
proyector: el anfitrión necesita forzar oscuro para proyectar o claro si hay luz.

**Architecture:** Tailwind pasa de `darkMode: 'media'` a `'class'`; los dos bloques
`@media (prefers-color-scheme: dark)` de `globals.css` pasan a `.dark`. La preferencia
vive en `localStorage` (es del dispositivo, no de la persona) y un script inline en el
`<head>` la aplica antes del primer pintado para que no haya fogonazo. Un `ThemeToggle`
de tres estados la cambia.

**Tech Stack:** Next.js 15 (App Router), Tailwind 3, Vitest + Testing Library (ya montado
en `apps/web`), Playwright.

## Global Constraints

- **La paleta no se toca.** Los colores oscuros que ya existen se mantienen tal cual:
  esto es fontanería de conmutación, no un rediseño. Las variantes `dark:` repartidas por
  la aplicación **no se tocan**: cambia quién enciende la clase, no las variantes.
- Tres estados exactos: **Claro**, **Oscuro**, **Automático**, con «Automático» por
  defecto (el comportamiento de hoy).
- La preferencia se guarda en `localStorage`, **no** en el perfil de usuario: la mitad de
  quien juega no tiene cuenta, y el tema es del dispositivo.
- **Sin desajuste de hidratación**: ningún componente puede renderizar contenido distinto
  según el tema en el primer render. El toggle enseña su estado solo tras montarse. La
  clase se aplica sobre `<html>`.
- El script anti-parpadeo va **inline y sin dependencias** en el `<head>`: es el único
  código que debe correr antes de la hidratación.
- Con «Automático», un cambio de tema del sistema debe reflejarse **sin recargar**
  (escuchar el evento `change` de `matchMedia`).
- `color-scheme` de `:root` debe seguir al tema elegido, para que los controles nativos
  (selectores, barras de scroll) no se queden en el tema contrario.
- Accesibilidad: el control lleva `aria-label` y estado marcado, y anuncia el tema activo,
  no solo el icono.
- `DESIGN.md` manda: si documenta el tema como automático, se actualiza en este mismo
  cambio. Aplica `gramola-design-taste` para el aspecto del control.
- Comentarios, documentación y mensajes de commit en español.
- Nunca `docker compose down -v`.

## Estado actual verificado (no hace falta volver a investigarlo)

- `apps/web/tailwind.config.ts:14`: `darkMode: 'media'`.
- `apps/web/src/app/globals.css`: `:root` (línea 5) declara `color-scheme: light dark` y
  `--vinyl-hole: #faf6ec`; hay **dos** bloques `@media (prefers-color-scheme: dark)`: el
  de `:root` (línea 11, cambia `--vinyl-hole` a `#100e0c`) y el de `body` (línea 36, fondo
  y texto oscuros con su propio `background-image`).
- `apps/web/src/app/layout.tsx:56-59`: `themeColor` con dos entradas por
  `prefers-color-scheme`. Línea 64: `<html lang="es" className={...variables de fuentes}>`,
  con `<body>` conteniendo `<Providers>` y `<PwaProvider />`.
- `apps/web/src/components/user-menu.tsx`: menú de quien tiene cuenta, con el enlace «Tu
  cuenta» y el botón «Cerrar sesión».
- `apps/web/src/app/page.tsx`: la portada tiene un `<nav>` con el logo a la izquierda y el
  enlace «Acceder» a la derecha.
- `apps/web` **ya tiene Vitest** (jsdom, Testing Library, `pnpm --filter @bingo/web test`),
  con pruebas en `src/**/*.test.{ts,tsx}`.

## Estructura de archivos

| Archivo                                                    | Responsabilidad                                        |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| `apps/web/src/lib/theme.ts` (nuevo)                        | Estados, lectura/escritura y resolución pura del tema. |
| `apps/web/src/lib/theme.test.ts` (nuevo)                   | La tabla preferencia × sistema → clase.                |
| `apps/web/tailwind.config.ts` (modificar)                  | `darkMode: 'class'`.                                   |
| `apps/web/src/app/globals.css` (modificar)                 | Los dos bloques `@media` pasan a `.dark`.              |
| `apps/web/src/app/layout.tsx` (modificar)                  | Script anti-parpadeo inline en el `<head>`.            |
| `apps/web/src/components/theme-toggle.tsx` (nuevo)         | El control de tres estados.                            |
| `apps/web/src/components/theme-toggle.test.tsx`            | Estado marcado, etiqueta y persistencia.               |
| `apps/web/src/components/user-menu.tsx` (modificar)        | El control, para quien tiene cuenta.                   |
| `apps/web/src/app/page.tsx` (modificar)                    | El control en la portada, junto a «Acceder».           |
| `e2e/tema.spec.ts` (nuevo)                                 | Persistencia tras recarga y automático en caliente.    |
| `DESIGN.md`, `DECISIONS.md`, `CHANGELOG.md`, `PROGRESS.md` | Documentación.                                         |

---

### Task 1: La resolución del tema, en lógica pura y probada

**Files:**

- Create: `apps/web/src/lib/theme.ts`
- Test: `apps/web/src/lib/theme.test.ts`

**Interfaces:**

- Produces:

  ```ts
  export type ThemePreference = 'light' | 'dark' | 'system';
  export const THEME_STORAGE_KEY = 'gramola:theme';
  /** El tema efectivo, ya resuelto: lo que decide si `<html>` lleva `.dark`. */
  export function resolveTheme(pref: ThemePreference, systemPrefersDark: boolean): 'light' | 'dark';
  /** Lee la preferencia guardada. Cualquier valor desconocido cae en 'system'. */
  export function readStoredPreference(storage?: Pick<Storage, 'getItem'>): ThemePreference;
  /** Aplica el tema al documento: clase en <html> y `color-scheme`. */
  export function applyTheme(theme: 'light' | 'dark', root?: HTMLElement): void;
  ```

  Lo consumen el script del layout (Tarea 2, en versión inline) y el toggle (Tarea 3).

- [ ] **Step 1: Escribir la prueba que falla**

Crea `apps/web/src/lib/theme.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyTheme,
  readStoredPreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from './theme';

describe('resolveTheme', () => {
  const casos: Array<[ThemePreference, boolean, 'light' | 'dark']> = [
    ['light', false, 'light'],
    ['light', true, 'light'],
    ['dark', false, 'dark'],
    ['dark', true, 'dark'],
    ['system', false, 'light'],
    ['system', true, 'dark'],
  ];

  it.each(casos)('preferencia %s con sistema oscuro=%s da %s', (pref, sistemaOscuro, esperado) => {
    expect(resolveTheme(pref, sistemaOscuro)).toBe(esperado);
  });
});

describe('readStoredPreference', () => {
  it('sin nada guardado, automático: es el comportamiento de siempre', () => {
    expect(readStoredPreference({ getItem: () => null })).toBe('system');
  });

  it('lee la preferencia guardada', () => {
    expect(readStoredPreference({ getItem: () => 'dark' })).toBe('dark');
  });

  /*
   * El valor puede venir de una versión anterior o de alguien tocando el
   * almacenamiento a mano. Un tema desconocido no puede dejar la aplicación
   * sin tema: cae en automático.
   */
  it('un valor desconocido cae en automático', () => {
    expect(readStoredPreference({ getItem: () => 'neón' })).toBe('system');
  });

  it('si el almacenamiento lanza (modo privado), cae en automático', () => {
    expect(
      readStoredPreference({
        getItem: () => {
          throw new Error('bloqueado');
        },
      }),
    ).toBe('system');
  });
});

describe('applyTheme', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    document.documentElement.style.colorScheme = '';
  });

  it('en oscuro pone la clase y el color-scheme', () => {
    applyTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('en claro los quita', () => {
    applyTheme('dark');
    applyTheme('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('no pisa otras clases del elemento', () => {
    document.documentElement.className = 'fuente-display';
    applyTheme('dark');
    expect(document.documentElement.className).toContain('fuente-display');
  });
});

describe('THEME_STORAGE_KEY', () => {
  it('la clave es estable: cambiarla borraría la preferencia de todo el mundo', () => {
    expect(THEME_STORAGE_KEY).toBe('gramola:theme');
  });
});
```

- [ ] **Step 2: Verla fallar**

Run: `pnpm --filter @bingo/web test`
Expected: FAIL, no existe `./theme`.

- [ ] **Step 3: Implementar `apps/web/src/lib/theme.ts`**

Escribe las cuatro exportaciones con comentarios en español que expliquen el porqué: por
qué la preferencia es del dispositivo y no del perfil, y por qué cualquier valor raro cae
en automático. `readStoredPreference` debe tolerar que `localStorage` lance (modo privado
de algunos navegadores) y funcionar con el objeto que se le pase, para poder probarlo.

- [ ] **Step 4: Verla pasar**

Run: `pnpm --filter @bingo/web test && pnpm --filter @bingo/web typecheck && pnpm --filter @bingo/web lint`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/theme.ts apps/web/src/lib/theme.test.ts
git commit -m "feat(web): resolución del tema en lógica pura y probada"
```

---

### Task 2: Tailwind por clase, CSS con `.dark` y script anti-parpadeo

**Files:**

- Modify: `apps/web/tailwind.config.ts:14`
- Modify: `apps/web/src/app/globals.css` (bloques de las líneas 11 y 36)
- Modify: `apps/web/src/app/layout.tsx`

**Interfaces:**

- Consumes: `THEME_STORAGE_KEY` de la Tarea 1 — pero el script del `<head>` es inline y no
  puede importar nada, así que la clave se escribe literal ahí con un comentario que
  remita a `lib/theme.ts`.

- [ ] **Step 1: Tailwind**

`darkMode: 'media'` → `darkMode: 'class'`.

- [ ] **Step 2: CSS**

- El bloque `@media (prefers-color-scheme: dark) { :root { --vinyl-hole: … } }` pasa a
  `.dark { --vinyl-hole: … }`.
- El bloque `@media (prefers-color-scheme: dark) { body { … } }` pasa a `.dark body { … }`
  conservando **exactamente** los mismos colores y el mismo `background-image`.
- `color-scheme: light dark` en `:root` se queda como valor inicial, pero el tema efectivo
  lo fija `applyTheme` sobre el estilo en línea de `<html>`; comprueba que no se pisan.

- [ ] **Step 3: Script anti-parpadeo**

En `layout.tsx`, dentro del `<head>` (o como `<script>` antes del contenido del `<body>`,
según lo que permita el App Router), un script inline mínimo:

```tsx
<script
  // Corre antes del primer pintado: sin esto, quien tenga el tema
  // oscuro guardado ve un fogonazo blanco en cada carga. Es el único
  // código que no puede esperar a la hidratación, de ahí que vaya
  // inline y sin importar nada. La clave es la de `lib/theme.ts`.
  dangerouslySetInnerHTML={{
    __html: `(function(){try{var p=localStorage.getItem('gramola:theme');var d=p==='dark'||((p===null||p==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`,
  }}
/>
```

Ajusta el literal si la implementación de la Tarea 1 usa otros valores, pero **no**
cambies la clave ni los nombres de los estados: tienen que coincidir exactamente.

- [ ] **Step 4: Comprobar que nada se rompió**

Run: `pnpm --filter @bingo/web test && pnpm --filter @bingo/web typecheck && pnpm --filter @bingo/web lint && pnpm --filter @bingo/web build`

- [ ] **Step 5: Mirarlo**

Con la aplicación levantada, y sin toggle todavía, comprueba a mano: con el sistema en
oscuro la aplicación sale oscura; con `localStorage.setItem('gramola:theme','light')` y
recarga, sale clara y **sin fogonazo**; en la consola no hay avisos de hidratación. Cuenta
en el informe qué viste, con capturas si ayudan (no las commitees).

- [ ] **Step 6: Commit**

```bash
git add apps/web/tailwind.config.ts apps/web/src/app/globals.css apps/web/src/app/layout.tsx
git commit -m "feat(web): el tema oscuro se enciende por clase, sin fogonazo"
```

---

### Task 3: El control de tres estados

**Files:**

- Create: `apps/web/src/components/theme-toggle.tsx`
- Test: `apps/web/src/components/theme-toggle.test.tsx`
- Modify: `apps/web/src/components/user-menu.tsx`
- Modify: `apps/web/src/app/page.tsx` (el `<nav>`, junto a «Acceder»)

**Interfaces:**

- Consumes: todo lo de la Tarea 1.
- Produces: `export function ThemeToggle(props: { className?: string }): JSX.Element`.

- [ ] **Step 1: Escribir la prueba que falla**

`apps/web/src/components/theme-toggle.test.tsx`: con Testing Library, comprueba que
(a) tras montarse hay tres controles accesibles por su nombre —Claro, Oscuro,
Automático—, (b) el activo está marcado (`aria-pressed` o `aria-checked` según el patrón
que elijas, y el test comprueba el que sea), (c) pulsar «Oscuro» guarda `dark` en
`localStorage` y pone la clase en `<html>`, y (d) el nombre accesible del grupo dice cuál
es el tema activo, no solo el icono. Usa `localStorage` real de jsdom y límpialo entre
pruebas.

- [ ] **Step 2: Verla fallar**

Run: `pnpm --filter @bingo/web test`

- [ ] **Step 3: Implementar el control**

Tres estados, `localStorage`, y suscripción al `change` de
`matchMedia('(prefers-color-scheme: dark)')` para que «Automático» siga al sistema en
caliente. **Nada de renderizar el tema activo en el primer paso**: el estado marcado
aparece tras montarse (`useEffect`), o el servidor y el cliente discreparán. Aspecto: usa
el sistema visual existente (`gramola-design-taste`, `DESIGN.md`), sin colores ni tamaños
nuevos, con iconos de `lucide-react` como el resto.

- [ ] **Step 4: Colocarlo**

- En `user-menu.tsx`, junto al enlace «Tu cuenta» y el botón «Cerrar sesión», sin romper
  la disposición actual en móvil.
- En el `<nav>` de la portada, junto a «Acceder».

- [ ] **Step 5: Comprobar**

Run: `pnpm --filter @bingo/web test && pnpm --filter @bingo/web typecheck && pnpm --filter @bingo/web lint && pnpm --filter @bingo/web build`

Y míralo de verdad: cambia entre los tres estados en la portada y en el panel, recarga en
cada uno, y comprueba que no hay avisos de hidratación en consola. Cuéntalo en el informe.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): selector de tema claro, oscuro o automático"
```

---

### Task 4: E2E, documentación y verificación

**Files:**

- Create: `e2e/tema.spec.ts`
- Modify: `DESIGN.md`, `DECISIONS.md`, `CHANGELOG.md`, `PROGRESS.md`

- [ ] **Step 1: E2E**

`e2e/tema.spec.ts`, dos pruebas:

1. **Persiste y no parpadea**: entra en la portada, elige «Oscuro», recarga, y comprueba
   que `<html>` conserva la clase `dark` **ya en el primer pintado** (compruébalo sin
   esperar a la hidratación: por ejemplo evaluando la clase inmediatamente tras
   `goto` con `waitUntil: 'commit'`, o afirmando que no hay un estado intermedio claro).
2. **Automático en caliente**: con «Automático» elegido, `page.emulateMedia({ colorScheme: 'dark' })`
   y comprobar que la clase aparece **sin recargar**; luego `'light'` y que desaparece.

- [ ] **Step 2: Ejecutar**

```bash
docker compose up -d
pnpm exec playwright test e2e/tema.spec.ts e2e/portada.spec.ts
```

- [ ] **Step 3: Documentar**

- `DESIGN.md`: si dice que el tema lo decide el sistema, actualízalo: ahora hay tres
  estados y «Automático» es el de por defecto.
- `DECISIONS.md`: anota que el `themeColor` del layout sigue resolviéndose por
  `prefers-color-scheme`, así que con el tema forzado la barra del navegador puede no
  coincidir con la interfaz; es un detalle menor y aceptado.
- `CHANGELOG.md`, bajo `## [Unreleased]` → `### Added`:

```markdown
- Selector de tema claro, oscuro o automático, guardado en el propio dispositivo. Nace en
  automático, que es como se comportaba hasta ahora, y el anfitrión puede forzar el tema
  que le convenga para proyectar sin tocar los ajustes del sistema.
```

- `PROGRESS.md`: el spec 5 del pulido posterior a v0.6.0 como hecho.

- [ ] **Step 4: Validación**

Aplica `verify-gramola`. Como suelo: `pnpm test`, typecheck/lint/build de `@bingo/web`, y
las dos pruebas E2E nuevas. La suite completa tiene inestabilidad conocida y anterior.

- [ ] **Step 5: Commit**

```bash
git add e2e/tema.spec.ts DESIGN.md DECISIONS.md CHANGELOG.md PROGRESS.md
git commit -m "test(e2e): el tema elegido persiste y el automático sigue al sistema"
```

---

## Fuera de alcance (del spec, explícito)

- La paleta y los colores oscuros existentes.
- El proyector, que hereda el tema como cualquier otra pantalla.
- Guardar el tema en el perfil de usuario.
