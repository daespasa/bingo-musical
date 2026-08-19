import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Sin `test.globals` en la config, RTL no detecta un `afterEach` global y no
// desmonta entre pruebas: los `render()` de una prueba se cuelan en la
// siguiente. Se registra el cleanup a mano.
afterEach(() => {
  cleanup();
});
