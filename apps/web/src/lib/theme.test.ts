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
