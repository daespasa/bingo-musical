import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeToggle } from './theme-toggle';
import { THEME_STORAGE_KEY } from '@/lib/theme';

// jsdom no implementa matchMedia: se simula un sistema en claro y estático
// (sin listeners reales), suficiente para las pruebas de montaje y de clic.
function mockMatchMedia() {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList;
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.style.colorScheme = '';
    mockMatchMedia();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.style.colorScheme = '';
  });

  it('tras montarse ofrece los tres controles por su nombre', async () => {
    render(<ThemeToggle />);
    expect(await screen.findByRole('button', { name: 'Claro' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Oscuro' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Automático' })).toBeInTheDocument();
  });

  it('sin preferencia guardada, el activo tras montarse es Automático', async () => {
    render(<ThemeToggle />);
    const automatico = await screen.findByRole('button', { name: 'Automático' });
    expect(automatico).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Claro' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Oscuro' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('pulsar Oscuro guarda la preferencia y marca la clase en <html>', async () => {
    render(<ThemeToggle />);
    const oscuro = await screen.findByRole('button', { name: 'Oscuro' });

    fireEvent.click(oscuro);

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(oscuro).toHaveAttribute('aria-pressed', 'true');
  });

  it('el nombre accesible del grupo dice cuál es el tema activo', async () => {
    render(<ThemeToggle />);

    expect(await screen.findByRole('group', { name: 'Tema: Automático' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Claro' }));

    expect(screen.getByRole('group', { name: 'Tema: Claro' })).toBeInTheDocument();
  });
});
