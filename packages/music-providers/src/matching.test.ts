import { describe, expect, it } from 'vitest';
import { diceCoefficient, isValidPreviewUrl, pickBestCandidate, scoreCandidate } from './matching';

const CDN = 'https://p.scdn.co/mp3-preview/abc123';

describe('diceCoefficient', () => {
  it('devuelve 1 con cadenas idénticas', () => {
    expect(diceCoefficient('neon nights', 'neon nights')).toBe(1);
  });

  it('devuelve 0 sin bigramas comunes', () => {
    expect(diceCoefficient('abc', 'xyz')).toBe(0);
  });

  it('puntúa alto cadenas parecidas', () => {
    expect(diceCoefficient('neon nights', 'neon night')).toBeGreaterThan(0.8);
  });
});

describe('scoreCandidate', () => {
  it('da confianza máxima con Track ID exacto', () => {
    const score = scoreCandidate(
      { title: 'Otra cosa', artist: 'Otro', spotifyTrackId: 'abc' },
      { name: 'No coincide - Nadie', trackId: 'abc', previewUrls: [CDN] },
    );
    expect(score).toBe(1);
  });

  it('puntúa alto cuando título y artista coinciden', () => {
    const score = scoreCandidate(
      { title: 'Neon Nights', artist: 'The Demo Waves' },
      { name: 'Neon Nights - The Demo Waves', previewUrls: [CDN] },
    );
    expect(score).toBeGreaterThan(0.95);
  });

  it('ignora acentos y mayúsculas', () => {
    const score = scoreCandidate(
      { title: 'Corazón de Chip', artist: 'Los Sintéticos' },
      { name: 'CORAZON DE CHIP - los sinteticos', previewUrls: [CDN] },
    );
    expect(score).toBeGreaterThan(0.95);
  });

  it('puntúa bajo cuando no se parecen', () => {
    const score = scoreCandidate(
      { title: 'Neon Nights', artist: 'The Demo Waves' },
      { name: 'Bohemian Rhapsody - Queen', previewUrls: [CDN] },
    );
    expect(score).toBeLessThan(0.3);
  });

  it('penaliza duraciones muy dispares', () => {
    const input = { title: 'Neon Nights', artist: 'The Demo Waves', durationMs: 180000 };
    const igual = scoreCandidate(input, {
      name: 'Neon Nights - The Demo Waves',
      durationMs: 181000,
      previewUrls: [CDN],
    });
    const dispar = scoreCandidate(input, {
      name: 'Neon Nights - The Demo Waves',
      durationMs: 400000,
      previewUrls: [CDN],
    });
    expect(dispar).toBeLessThan(igual);
  });
});

describe('isValidPreviewUrl', () => {
  it('acepta URLs https del CDN de Spotify', () => {
    expect(isValidPreviewUrl(CDN)).toBe(true);
  });

  it('rechaza http, otros dominios y basura', () => {
    expect(isValidPreviewUrl('http://p.scdn.co/x')).toBe(false);
    expect(isValidPreviewUrl('https://evil.com/x.mp3')).toBe(false);
    expect(isValidPreviewUrl('https://scdn.co.evil.com/x')).toBe(false);
    expect(isValidPreviewUrl('no-es-una-url')).toBe(false);
  });
});

describe('pickBestCandidate', () => {
  const input = { title: 'Neon Nights', artist: 'The Demo Waves' };

  it('elige el candidato con mayor confianza', () => {
    const best = pickBestCandidate(input, [
      { name: 'Otra Canción - Otro Artista', previewUrls: [CDN] },
      { name: 'Neon Nights - The Demo Waves', previewUrls: [`${CDN}2`] },
    ]);
    expect(best?.url).toBe(`${CDN}2`);
    expect(best?.confidence).toBeGreaterThan(0.9);
  });

  it('descarta candidatos sin preview válida', () => {
    const best = pickBestCandidate(input, [
      { name: 'Neon Nights - The Demo Waves', previewUrls: ['https://evil.com/a.mp3'] },
      { name: 'Neon Nights - The Demo Waves', previewUrls: [CDN] },
    ]);
    expect(best?.url).toBe(CDN);
  });

  it('devuelve null si ninguno tiene preview válida', () => {
    expect(pickBestCandidate(input, [{ name: 'X - Y', previewUrls: [] }])).toBeNull();
  });
});
