# Salida de partida — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-08-11-salida-de-partida-design.md` (vive en la
rama `fix/config-por-modo`; esta rama sale de `main`, así que el spec no está en el
árbol de trabajo — todo lo que hace falta de él está copiado aquí).

**Goal:** Que salir de una partida devuelva a cada quien a su sitio: `/dashboard` si
tiene sesión, `/` si es invitado, con la etiqueta diciendo a dónde lleva.

**Architecture:** Un hook (`useIsAuthenticated`) sobre la consulta `['me']` que ya
usa `UserMenu`, con tres estados en vez de un booleano para no parpadear mientras
carga; y un componente único (`ExitGameLink`) que sustituye los tres enlaces «Salir»
que hoy apuntan a `/` a pelo. No se toca la API ni la base de datos.

**Tech Stack:** Next.js 15 (App Router, componentes cliente), TanStack Query v5,
Tailwind, Vitest + Testing Library (nuevo en `apps/web`), Playwright.

## Global Constraints

- Ámbito: solo `apps/web` y `e2e/`. Sin migraciones, sin cambios en `apps/api`.
- Destinos: **con sesión → `/dashboard`**; **sin sesión → `/`**.
- Etiquetas exactas: autenticado «**Volver a mis partidas**»; invitado «**Salir**».
- Mientras la sesión está en vuelo, el control se renderiza **deshabilitado**, nunca
  apuntando a un destino que luego cambia.
- Un 401 de `/auth/me` significa `invitado`; **cualquier otro fallo** (red, 500)
  significa `cargando`: no se expulsa a nadie por un error de red.
- No se toca `/auth/logout` ni `UserMenu`: cerrar sesión sigue siendo aparte.
- No se tocan los enlaces a `/` de las cabeceras de login, registro y join (son el
  logo).
- Aspecto actual intacto: clase `btn-secondary`, sin colores ni tamaños nuevos.
- Respuestas y comentarios de código en español (`CLAUDE.md`).
- Decisión tomada con el usuario: la prueba unitaria del hook se hace montando
  **Vitest en `apps/web`** (hoy no hay runner ahí), no metiendo lógica de UI en
  `@bingo/shared`.
- Desviación consciente del spec: el spec dice «un hook en `lib/`», pero el repo ya
  tiene `apps/web/src/hooks/` (`use-room.ts`, `use-round-audio.ts`). Va en `hooks/`.

## Estado actual verificado (no hace falta volver a investigarlo)

- Tres enlaces a `/`, todos `btn-secondary`:
  - `apps/web/src/components/podium.tsx:270-272` — texto «Salir».
  - `apps/web/src/app/room/[code]/results/page.tsx:50-52` — texto «Inicio» (estado de
    error: la sala no tiene resultados).
  - `apps/web/src/app/room/[code]/results/page.tsx:115-117` — texto «Volver al
    inicio», con `self-center`.
- `PodiumCeremony` se renderiza en tres páginas: `room/[code]/play/page.tsx:124`
  (jugador), `room/[code]/host/page.tsx:90` (anfitrión, con `canRematch`) y
  `room/[code]/screen/page.tsx:45` (proyector).
- `UserMenu` (`apps/web/src/components/user-menu.tsx:12-15`) ya hace
  `useQuery({ queryKey: ['me'], queryFn: () => api<PublicUser>('/auth/me') })`.
- `api()` (`apps/web/src/lib/api.ts:25-51`) lanza `ApiError(status, message)` cuando
  la respuesta no es `ok`.
- El manejador global de 401 (`apps/web/src/components/providers.tsx:21-24`) sale
  antes si la ruta no empieza por `/dashboard`, así que llamar a `/auth/me` desde una
  sala siendo invitado **no** expulsa a nadie. No hay que tocarlo.
- `QueryClient` global: `defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } }`
  (`providers.tsx:11-13`). El hook fija `retry: false` para no reintentar un 401.
- `apps/web/package.json` solo tiene `dev`, `build`, `start`, `typecheck`, `lint`. No
  hay tests unitarios; sí los hay en `apps/api` (Vitest, `apps/api/vitest.config.ts`).
- `turbo.json` ya define la tarea `test`; basta con que el paquete tenga el script.
- Playwright: un solo proyecto `chromium`, `workers: 1`, `testDir: './e2e'`,
  `baseURL: http://localhost:3000`.

## Estructura de archivos

| Archivo                                                     | Responsabilidad                                           |
| ----------------------------------------------------------- | --------------------------------------------------------- |
| `apps/web/vitest.config.ts` (nuevo)                         | Runner de tests unitarios de la web: jsdom, alias `@`.    |
| `apps/web/package.json` (modificar)                         | Script `test` y devDependencies del runner.               |
| `apps/web/src/hooks/use-is-authenticated.ts` (nuevo)        | Estado de sesión en tres valores.                         |
| `apps/web/src/hooks/use-is-authenticated.test.tsx` (nuevo)  | Prueba unitaria del hook.                                 |
| `apps/web/src/components/exit-game-link.tsx` (nuevo)        | Único control de salida: destino + etiqueta.              |
| `apps/web/src/components/podium.tsx` (modificar)            | Usa `ExitGameLink` en vez del `Link` a `/`.               |
| `apps/web/src/app/room/[code]/results/page.tsx` (modificar) | Idem, en sus dos enlaces.                                 |
| `e2e/salida-de-partida.spec.ts` (nuevo)                     | Recorrido real: anfitrión a `/dashboard`, invitado a `/`. |

---

### Task 1: Hook `useIsAuthenticated` (con la infraestructura de tests de la web)

**Files:**

- Create: `apps/web/vitest.config.ts`
- Modify: `apps/web/package.json`
- Create: `apps/web/src/hooks/use-is-authenticated.ts`
- Test: `apps/web/src/hooks/use-is-authenticated.test.tsx`

**Interfaces:**

- Consumes: `api`, `ApiError`, `PublicUser` de `@/lib/api`.
- Produces:

  ```ts
  export type AuthState = 'autenticado' | 'invitado' | 'cargando';
  export function useIsAuthenticated(): AuthState;
  ```

- [ ] **Step 1: Instalar el runner de tests unitarios en la web**

Cuatro dependencias de desarrollo, solo en `apps/web`:

```bash
pnpm --filter @bingo/web add -D vitest@^3.0.0 jsdom@^26.0.0 @testing-library/react@^16.1.0 @vitejs/plugin-react@^4.3.4
```

Añade el script `test` en `apps/web/package.json`, junto a `typecheck`:

```json
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests",
```

- [ ] **Step 2: Configurar Vitest**

Crea `apps/web/vitest.config.ts`:

```ts
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Tests de piezas de cliente (hooks y componentes): necesitan DOM y el alias
// `@` que usa el resto de la aplicación.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
  },
});
```

- [ ] **Step 3: Escribir la prueba que falla**

Crea `apps/web/src/hooks/use-is-authenticated.test.tsx`. Los tres casos del spec:
401 → `invitado`, respuesta correcta → `autenticado`, error de red → `cargando`.

```tsx
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { useIsAuthenticated } from './use-is-authenticated';

const api = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async () => {
  const real = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...real, api };
});

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useIsAuthenticated', () => {
  beforeEach(() => {
    api.mockReset();
  });

  it('empieza en cargando mientras la consulta está en vuelo', () => {
    api.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useIsAuthenticated(), { wrapper });
    expect(result.current).toBe('cargando');
  });

  it('da autenticado cuando /auth/me responde', async () => {
    api.mockResolvedValue({ id: 'u1', displayName: 'Demo' });
    const { result } = renderHook(() => useIsAuthenticated(), { wrapper });
    await waitFor(() => expect(result.current).toBe('autenticado'));
  });

  it('da invitado cuando /auth/me responde 401', async () => {
    api.mockRejectedValue(new ApiError(401, 'No autenticado'));
    const { result } = renderHook(() => useIsAuthenticated(), { wrapper });
    await waitFor(() => expect(result.current).toBe('invitado'));
  });

  it('se queda en cargando ante un error de red: no expulsa a nadie', async () => {
    api.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useIsAuthenticated(), { wrapper });
    await waitFor(() => expect(api).toHaveBeenCalled());
    expect(result.current).toBe('cargando');
  });

  it('trata un 500 como cargando, no como invitado', async () => {
    api.mockRejectedValue(new ApiError(500, 'Boom'));
    const { result } = renderHook(() => useIsAuthenticated(), { wrapper });
    await waitFor(() => expect(api).toHaveBeenCalled());
    expect(result.current).toBe('cargando');
  });
});
```

- [ ] **Step 4: Ejecutar la prueba y comprobar que falla**

Run: `pnpm --filter @bingo/web test`
Expected: FAIL — `Failed to resolve import "./use-is-authenticated"`.

- [ ] **Step 5: Implementar el hook**

Crea `apps/web/src/hooks/use-is-authenticated.ts`:

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { ApiError, api, type PublicUser } from '@/lib/api';

/**
 * Estado de sesión en tres valores en lugar de un booleano: quien decide un
 * destino con esto no debe apuntar a ningún sitio mientras la consulta está en
 * vuelo, o el enlace cambia bajo el dedo.
 */
export type AuthState = 'autenticado' | 'invitado' | 'cargando';

/**
 * Comparte la clave `['me']` con `UserMenu`, así que en las pantallas con menú
 * el dato suele venir de caché y no hay petición nueva.
 *
 * `/auth/me` responde 401 sin sesión, y eso llega como error de la consulta, no
 * como `data: null`. Solo el 401 significa invitado: cualquier otro fallo (red,
 * 500) se queda en `cargando`, porque expulsar a alguien de su panel por un
 * corte de red es peor que un botón deshabilitado.
 */
export function useIsAuthenticated(): AuthState {
  const { data, error } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<PublicUser>('/auth/me'),
    retry: false,
  });

  if (error) {
    return error instanceof ApiError && error.status === 401 ? 'invitado' : 'cargando';
  }
  return data ? 'autenticado' : 'cargando';
}
```

- [ ] **Step 6: Ejecutar la prueba y comprobar que pasa**

Run: `pnpm --filter @bingo/web test`
Expected: PASS, 5 pruebas.

- [ ] **Step 7: Comprobar tipos y estilo**

Run: `pnpm --filter @bingo/web typecheck && pnpm --filter @bingo/web lint`
Expected: sin errores. Si `tsc` se queja de los tipos de Vitest en el `.test.tsx`,
no añadas `types` globales: importa siempre desde `vitest` explícitamente (ya lo
hace la prueba).

- [ ] **Step 8: Commit**

```bash
git add apps/web/package.json apps/web/vitest.config.ts apps/web/src/hooks/use-is-authenticated.ts apps/web/src/hooks/use-is-authenticated.test.tsx pnpm-lock.yaml
git commit -m "feat(web): hook de estado de sesión en tres valores"
```

---

### Task 2: Componente `ExitGameLink` y sustitución de los tres botones

**Files:**

- Create: `apps/web/src/components/exit-game-link.tsx`
- Test: `apps/web/src/components/exit-game-link.test.tsx`
- Modify: `apps/web/src/components/podium.tsx:270-272`
- Modify: `apps/web/src/app/room/[code]/results/page.tsx:50-52` y `:115-117`

**Interfaces:**

- Consumes: `useIsAuthenticated()` y el tipo `AuthState` de `@/hooks/use-is-authenticated`.
- Produces: `export function ExitGameLink(props: { className?: string }): JSX.Element`
  — `className` se **añade** a `btn-secondary` (para casos como `self-center`), no
  lo sustituye.

- [ ] **Step 1: Escribir la prueba que falla**

Crea `apps/web/src/components/exit-game-link.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExitGameLink } from './exit-game-link';

const useIsAuthenticated = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-is-authenticated', () => ({ useIsAuthenticated }));

describe('ExitGameLink', () => {
  beforeEach(() => {
    useIsAuthenticated.mockReset();
  });

  it('lleva al panel y lo dice, con sesión', () => {
    useIsAuthenticated.mockReturnValue('autenticado');
    render(<ExitGameLink />);
    const link = screen.getByRole('link', { name: 'Volver a mis partidas' });
    expect(link).toHaveAttribute('href', '/dashboard');
  });

  it('lleva a la portada siendo invitado', () => {
    useIsAuthenticated.mockReturnValue('invitado');
    render(<ExitGameLink />);
    expect(screen.getByRole('link', { name: 'Salir' })).toHaveAttribute('href', '/');
  });

  it('mientras carga no apunta a ningún sitio: botón deshabilitado', () => {
    useIsAuthenticated.mockReturnValue('cargando');
    render(<ExitGameLink />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByRole('button', { name: 'Salir' })).toBeDisabled();
  });

  it('conserva el aspecto y admite clases extra', () => {
    useIsAuthenticated.mockReturnValue('invitado');
    render(<ExitGameLink className="self-center" />);
    const link = screen.getByRole('link', { name: 'Salir' });
    expect(link.className).toContain('btn-secondary');
    expect(link.className).toContain('self-center');
  });
});
```

`toHaveAttribute`/`toBeDisabled` vienen de `@testing-library/jest-dom`, que **no**
está instalado. Instálalo y engánchalo:

```bash
pnpm --filter @bingo/web add -D @testing-library/jest-dom@^6.6.3
```

Crea `apps/web/vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

Y en `apps/web/vitest.config.ts`, dentro de `test`, añade la línea:

```ts
    setupFiles: ['./vitest.setup.ts'],
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `pnpm --filter @bingo/web test`
Expected: FAIL — no existe `./exit-game-link`.

- [ ] **Step 3: Implementar el componente**

Crea `apps/web/src/components/exit-game-link.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useIsAuthenticated } from '@/hooks/use-is-authenticated';

/**
 * Salida de una partida terminada. El destino depende de quién sale: quien
 * tiene cuenta vuelve a sus partidas; el invitado vuelve a la portada, que es
 * su sitio (desde ahí entra a otra sala con otro código).
 *
 * La etiqueta dice a dónde lleva a propósito: «Salir» a secas, en una página
 * que ofrece «Crear partida» y «Entrar con código», se lee como cerrar sesión.
 */
export function ExitGameLink({ className = '' }: { className?: string }) {
  const state = useIsAuthenticated();
  const classes = `btn-secondary ${className}`.trim();

  // Mientras no se sabe, no se apunta a ningún sitio: un enlace que cambia de
  // destino al resolverse la consulta se pulsa antes de tiempo.
  if (state === 'cargando') {
    return (
      <button type="button" className={classes} disabled>
        Salir
      </button>
    );
  }

  const authenticated = state === 'autenticado';
  return (
    <Link href={authenticated ? '/dashboard' : '/'} className={classes}>
      {authenticated ? 'Volver a mis partidas' : 'Salir'}
    </Link>
  );
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `pnpm --filter @bingo/web test`
Expected: PASS (9 pruebas entre los dos archivos).

- [ ] **Step 5: Sustituir el botón del podio**

En `apps/web/src/components/podium.tsx`, cambia estas tres líneas (270-272):

```tsx
<Link href="/" className="btn-secondary">
  Salir
</Link>
```

por:

```tsx
<ExitGameLink />
```

Y añade el import junto a los demás de componentes:

```tsx
import { ExitGameLink } from '@/components/exit-game-link';
```

`Link` sigue usándose en el archivo (línea 267, «Ver resumen de la partida»): no
quites ese import.

- [ ] **Step 6: Sustituir los dos botones de la página de resultados**

En `apps/web/src/app/room/[code]/results/page.tsx`, añade el import:

```tsx
import { ExitGameLink } from '@/components/exit-game-link';
```

Cambia el estado de error (líneas 50-52):

```tsx
<Link href="/" className="btn-secondary">
  Inicio
</Link>
```

por:

```tsx
<ExitGameLink />
```

Y el pie de la página (líneas 115-117):

```tsx
<Link href="/" className="btn-secondary self-center">
  Volver al inicio
</Link>
```

por:

```tsx
<ExitGameLink className="self-center" />
```

Tras los dos cambios, `Link` ya no se usa en el archivo: **borra** su import
(`import Link from 'next/link';`), o `lint` fallará por import sin usar.

- [ ] **Step 7: Comprobar tipos, estilo y build**

Run: `pnpm --filter @bingo/web typecheck && pnpm --filter @bingo/web lint && pnpm --filter @bingo/web test`
Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/exit-game-link.tsx apps/web/src/components/exit-game-link.test.tsx apps/web/src/components/podium.tsx "apps/web/src/app/room/[code]/results/page.tsx" apps/web/vitest.config.ts apps/web/vitest.setup.ts apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): la salida de partida devuelve a cada quien a su sitio"
```

---

### Task 3: E2E — el anfitrión aterriza en el panel, el invitado en la portada

**Files:**

- Create: `e2e/salida-de-partida.spec.ts`

**Interfaces:**

- Consumes: `loginAsHost`, `createGameAndOpenRoom`, `joinAsPlayer`, `enableAudio` de
  `e2e/helpers.ts` (mismas firmas que usa `e2e/gameplay.spec.ts`).

- [ ] **Step 1: Escribir la prueba**

Crea `e2e/salida-de-partida.spec.ts`. La secuencia hasta el podio es la de
`e2e/gameplay.spec.ts:12-72`, recortada a lo mínimo: no hace falta marcar casillas
ni pasar de ronda, solo terminar la partida.

```ts
import { expect, test } from '@playwright/test';
import { createGameAndOpenRoom, enableAudio, joinAsPlayer, loginAsHost } from './helpers';

test.describe('Salida de partida', () => {
  test('el anfitrión vuelve a sus partidas y el invitado a la portada', async ({
    browser,
    page,
  }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, { name: 'E2E salida de partida' });
    const marta = await joinAsPlayer(browser, code, 'Marta');
    await enableAudio(marta.page);

    await page.getByRole('button', { name: 'Empezar partida' }).click();
    await page.getByRole('button', { name: 'Finalizar' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('button', { name: 'Terminar y ver resultados' }).click();

    // El podio tarda en revelarse (la ceremonia va por pasos): los botones del
    // final aparecen cuando termina.
    await expect(page.getByText('¡Fin de la partida!')).toBeVisible();
    await expect(marta.page.getByText('¡Fin de la partida!')).toBeVisible();

    // Invitada: sale a la portada, donde puede entrar a otra sala con un código.
    const salir = marta.page.getByRole('link', { name: 'Salir' });
    await expect(salir).toBeVisible({ timeout: 20_000 });
    await salir.click();
    await expect(marta.page).toHaveURL(/\/$/);
    await expect(marta.page.getByRole('link', { name: /Entrar con código/ })).toBeVisible();

    // Anfitrión: vuelve al panel, y la sesión sigue viva (el menú de usuario
    // sigue ahí), que es justo lo que el botón anterior daba a entender que no.
    const volver = page.getByRole('link', { name: 'Volver a mis partidas' });
    await expect(volver).toBeVisible({ timeout: 20_000 });
    await volver.click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('link', { name: 'Tu cuenta' })).toBeVisible();

    await marta.context.close();
  });

  test('desde el resumen de la partida, el anfitrión también vuelve al panel', async ({ page }) => {
    await loginAsHost(page);
    const code = await createGameAndOpenRoom(page, { name: 'E2E salida desde resumen' });

    // El resumen de una sala sin resultados enseña el mismo control de salida.
    await page.goto(`/room/${code}/results`);
    const volver = page.getByRole('link', { name: 'Volver a mis partidas' });
    await expect(volver).toBeVisible();
    await volver.click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
```

- [ ] **Step 2: Levantar el entorno y ejecutar solo esta prueba**

Run:

```bash
docker compose up -d
pnpm exec playwright test e2e/salida-de-partida.spec.ts
```

Expected: 2 passed. (`docker compose down -v` está prohibido: borra los datos
locales.)

- [ ] **Step 3: Ajustar selectores si algo no encaja**

Si un selector falla —el texto del enlace de la portada, el nombre del diálogo de
finalizar—, **no** cambies el copy de la aplicación para que encaje: abre la traza
(`pnpm exec playwright show-trace test-results/**/trace.zip`) y corrige el selector.
El copy de la portada es el spec 4 y se toca allí, no aquí.

- [ ] **Step 4: Commit**

```bash
git add e2e/salida-de-partida.spec.ts
git commit -m "test(e2e): la salida de partida respeta quién sale"
```

---

### Task 4: Comprobación del proyector, verificación final y documentación

**Files:**

- Modify: `PROGRESS.md`
- Modify: `CHANGELOG.md` (sección `## [Unreleased]` → `### Changed`; créala si no
  existe, encima de `## [0.6.0] - 2026-08-11`)

- [ ] **Step 1: Comprobar el riesgo del proyector**

`PodiumCeremony` también se renderiza en `/room/[code]/screen`
(`apps/web/src/app/room/[code]/screen/page.tsx:45`). Con la aplicación arrancada
(`pnpm dev`), termina una partida y abre esa vista:

- Con la sesión del anfitrión: el botón dice «Volver a mis partidas» y lleva a
  `/dashboard`. Correcto: es su panel.
- En una ventana privada, sin sesión: dice «Salir» y lleva a `/`, no a un
  `/dashboard` que pediría iniciar sesión.

Si el segundo caso acaba en `/dashboard`, es un fallo del hook: revísalo antes de
seguir. No hace falta código nuevo para el proyector si ambos casos se cumplen.

- [ ] **Step 2: Revisar el propio diff**

Run: `git diff main --stat && git diff main`
Comprueba que no se han colado cambios ajenos (`.codegraph/daemon.pid` no se commitea)
y que los enlaces del logo en login, registro y join siguen apuntando a `/`.

- [ ] **Step 3: Validación mínima**

Aplica la skill `verify-gramola` y ejecuta lo que indique. Como suelo:

```bash
pnpm --filter @bingo/web typecheck
pnpm --filter @bingo/web lint
pnpm --filter @bingo/web test
pnpm --filter @bingo/web build
pnpm exec playwright test e2e/salida-de-partida.spec.ts e2e/gameplay.spec.ts
```

La suite E2E **completa** tiene inestabilidad conocida y anterior, reproducida
también en `main`. Si algo falla fuera de estos dos archivos, compruébalo en `main`
antes de tratarlo como regresión.

- [ ] **Step 4: Documentar**

En `CHANGELOG.md`, bajo `## [Unreleased]` → `### Changed`:

```markdown
- Salir de una partida devuelve a cada quien a su sitio: quien tiene cuenta vuelve
  a sus partidas y el invitado a la portada. El botón lo dice, para que salir no se
  confunda con cerrar sesión.
```

En `PROGRESS.md`, anota el spec 2 del pulido posterior a v0.6.0 como hecho, con el
mismo formato que usen las entradas vecinas.

- [ ] **Step 5: Commit**

```bash
git add CHANGELOG.md PROGRESS.md
git commit -m "docs: registra la salida de partida"
```

---

## Fuera de alcance (del spec, explícito)

- `/auth/logout` y `UserMenu`.
- Los enlaces a `/` de las cabeceras de login, registro y join.
- Cualquier cambio de copy de la portada: eso es el spec 4.
