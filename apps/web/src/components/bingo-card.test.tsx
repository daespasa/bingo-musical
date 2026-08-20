import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CardView, CellView } from '@bingo/shared';
import { BingoCardGrid } from './bingo-card';

function cell(overrides: Partial<CellView> = {}): CellView {
  return {
    id: 'c1',
    position: 0,
    displayTitle: 'Neon Nights',
    displayArtist: 'The Demo Waves',
    isFree: false,
    status: 'UNMARKED',
    coverUrl: '/covers/demo-01.png',
    ...overrides,
  };
}

function card(cells: CellView[]): CardView {
  return { id: 'card', size: 3, cells };
}

/*
 * La carátula es decorativa: va detrás de `aria-hidden`, así que no está en el
 * árbol de accesibilidad y se busca por el DOM, no por rol.
 */
function grid(cells: CellView[], showArtwork: boolean) {
  return render(
    <BingoCardGrid
      card={card(cells)}
      onMark={() => {}}
      disabled={false}
      showArtwork={showArtwork}
    />,
  );
}

describe('BingoCardGrid con portadas', () => {
  it('pinta la carátula y sigue enseñando el título', () => {
    const { container } = grid([cell()], true);
    expect(container.querySelector('img')).not.toBeNull();
    expect(screen.getByText('Neon Nights')).toBeInTheDocument();
  });

  it('sin carátula, la casilla es la de siempre', () => {
    const { container } = grid([cell({ coverUrl: null })], true);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('Neon Nights')).toBeInTheDocument();
  });

  it('con las portadas apagadas no se pide ninguna imagen', () => {
    const { container } = grid([cell()], false);
    expect(container.querySelector('img')).toBeNull();
  });

  it('sin resolver va desenfocada; resuelta, nítida', () => {
    const enJuego = grid([cell()], true);
    expect(enJuego.container.querySelector('img')?.className).toContain('blur');
    enJuego.unmount();

    const resuelta = grid([cell({ status: 'VALID' })], true);
    expect(resuelta.container.querySelector('img')?.className).not.toContain('blur');
  });
});
