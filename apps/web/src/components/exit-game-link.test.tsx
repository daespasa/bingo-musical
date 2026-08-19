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
    const button = screen.getByRole('button', { name: 'Salir' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('conserva el aspecto y admite clases extra', () => {
    useIsAuthenticated.mockReturnValue('invitado');
    render(<ExitGameLink className="self-center" />);
    const link = screen.getByRole('link', { name: 'Salir' });
    expect(link.className).toContain('btn-secondary');
    expect(link.className).toContain('self-center');
  });
});
