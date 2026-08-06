import { describe, expect, it } from 'vitest';
import {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  extractRoomCode,
  isCompleteRoomCode,
  normalizeRoomCode,
} from './room-code';

describe('alfabeto', () => {
  it('no contiene caracteres que se confundan al leerlos', () => {
    for (const ambiguous of ['0', 'O', '1', 'I', 'L']) {
      expect(ROOM_CODE_ALPHABET).not.toContain(ambiguous);
    }
  });
});

describe('normalizeRoomCode', () => {
  it('pasa a mayúsculas', () => {
    expect(normalizeRoomCode('abc234')).toBe('ABC234');
  });

  it('descarta separadores y caracteres fuera del alfabeto', () => {
    expect(normalizeRoomCode('ab c-2/3.4')).toBe('ABC234');
    expect(normalizeRoomCode('A0O1IL')).toBe('A');
  });

  it('corta a la longitud del código', () => {
    expect(normalizeRoomCode('ABC234XYZ')).toHaveLength(ROOM_CODE_LENGTH);
    expect(normalizeRoomCode('ABC234XYZ')).toBe('ABC234');
  });

  it('devuelve cadena vacía si no queda nada válido', () => {
    expect(normalizeRoomCode('0011!!')).toBe('');
  });
});

describe('isCompleteRoomCode', () => {
  it('distingue un código completo de uno a medias', () => {
    expect(isCompleteRoomCode('ABC234')).toBe(true);
    expect(isCompleteRoomCode('ABC23')).toBe(false);
  });
});

describe('extractRoomCode', () => {
  it('lee el código de un enlace de entrada a sala', () => {
    expect(extractRoomCode('https://bingo.daespasa.com/join/ABC234')).toBe('ABC234');
    expect(extractRoomCode('http://localhost:3000/join/abc234')).toBe('ABC234');
  });

  it('ignora lo que venga detrás del código', () => {
    expect(extractRoomCode('https://x.test/join/ABC234?ref=qr')).toBe('ABC234');
    expect(extractRoomCode('https://x.test/join/ABC234#alias')).toBe('ABC234');
  });

  it('acepta el código suelto', () => {
    expect(extractRoomCode('  abc 234 ')).toBe('ABC234');
  });

  it('rechaza un enlace que no lleva a una sala', () => {
    expect(extractRoomCode('https://abcdef234567.example.com')).toBeNull();
    expect(extractRoomCode('https://x.test/dashboard')).toBeNull();
  });

  it('rechaza un código incompleto', () => {
    expect(extractRoomCode('ABC23')).toBeNull();
    expect(extractRoomCode('https://x.test/join/ABC23')).toBeNull();
  });
});
