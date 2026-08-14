// Amplía los matchers de Vitest con los de `@testing-library/jest-dom`
// (`toBeInTheDocument`, `toHaveAttribute`, etc.) para `tsc --noEmit`.
//
// El propio `@testing-library/jest-dom/vitest` hace `import 'vitest'` desde
// dentro de su carpeta en node_modules; con pnpm eso puede resolver una copia
// de `vitest` distinta a la que usan los tests de este paquete, así que la
// ampliación no llega al `Assertion` real y los matchers dan error de tipos.
// Declarándolo aquí, dentro de `apps/web`, `vitest` se resuelve igual que en
// los tests: una única copia, sin tocar `paths` (que Next convierte en alias
// de webpack para el código de producción).
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- solo reexpone el supertipo para la ampliación de módulo
  interface Assertion<T = unknown> extends TestingLibraryMatchers<unknown, T> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- solo reexpone el supertipo para la ampliación de módulo
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<unknown, unknown> {}
}
