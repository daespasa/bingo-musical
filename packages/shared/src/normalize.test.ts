import { describe, expect, it } from 'vitest';
import { normalizeText, sanitizeAlias } from './normalize';
import { computeSpeedBonus } from './scoring';

describe('normalizeText', () => {
  it('quita acentos, mayúsculas y símbolos', () => {
    expect(normalizeText('Corazón Partío!')).toBe('corazon partio');
  });

  it('elimina sufijos de feat y remaster', () => {
    expect(normalizeText('Song (feat. Alguien)')).toBe('song');
    expect(normalizeText('Track - Remastered 2011')).toBe('track');
  });

  it('colapsa espacios', () => {
    expect(normalizeText('  a   b  ')).toBe('a b');
  });
});

describe('sanitizeAlias', () => {
  it('acepta alias válidos', () => {
    expect(sanitizeAlias('Marta')).toBe('Marta');
    expect(sanitizeAlias('  DJ Increíble ')).toBe('DJ Increíble');
  });

  it('rechaza HTML y longitudes inválidas', () => {
    expect(sanitizeAlias('<script>x</script>')).toBeNull();
    expect(sanitizeAlias('a')).toBeNull();
    expect(sanitizeAlias('x'.repeat(21))).toBeNull();
  });
});

describe('computeSpeedBonus', () => {
  it('da el máximo con respuesta inmediata', () => {
    expect(computeSpeedBonus(0, 10000, 50)).toBe(50);
  });

  it('da 0 al agotar la ventana', () => {
    expect(computeSpeedBonus(10000, 10000, 50)).toBe(0);
    expect(computeSpeedBonus(12000, 10000, 50)).toBe(0);
  });

  it('interpola linealmente', () => {
    expect(computeSpeedBonus(5000, 10000, 50)).toBe(25);
  });
});
