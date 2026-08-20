import { describe, expect, it } from 'vitest';
import { hasEnoughArtwork } from './artwork';

describe('hasEnoughArtwork', () => {
  it('el 80 % justo vale', () => {
    expect(hasEnoughArtwork(8, 10)).toBe(true);
  });

  it('por debajo del 80 % no', () => {
    expect(hasEnoughArtwork(7, 10)).toBe(false);
  });

  it('todas con carátula, obviamente sí', () => {
    expect(hasEnoughArtwork(10, 10)).toBe(true);
  });

  /*
   * Una colección vacía no «cumple» el umbral: activar portadas sobre nada
   * daría un cartón de huecos. Y dividir por cero no es una respuesta.
   */
  it('una colección vacía no vale', () => {
    expect(hasEnoughArtwork(0, 0)).toBe(false);
  });

  it('ninguna carátula tampoco', () => {
    expect(hasEnoughArtwork(0, 25)).toBe(false);
  });
});
