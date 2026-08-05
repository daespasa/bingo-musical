import { describe, expect, it, vi } from 'vitest';
import {
  SpotifyPreviewFinderProvider,
  type PreviewSearchFn,
} from './spotify-preview-finder.provider';

const CDN = 'https://p.scdn.co/mp3-preview/abc123';

const okResponse = {
  success: true,
  results: [
    {
      name: 'Neon Nights - The Demo Waves',
      trackId: 'track-1',
      durationMs: 180000,
      previewUrls: [CDN],
    },
  ],
};

const provider = (search: PreviewSearchFn, extra = {}) =>
  new SpotifyPreviewFinderProvider({
    search,
    backoffMs: 1,
    timeoutMs: 200,
    cacheTtlMs: 60_000,
    ...extra,
  });

const input = { title: 'Neon Nights', artist: 'The Demo Waves' };

describe('SpotifyPreviewFinderProvider', () => {
  it('resuelve una preview disponible con su confianza', async () => {
    const search = vi.fn().mockResolvedValue(okResponse);
    const result = await provider(search).resolve(input);

    expect(result.status).toBe('AVAILABLE');
    if (result.status !== 'AVAILABLE') return;
    expect(result.url).toBe(CDN);
    expect(result.provider).toBe('SPOTIFY_PREVIEW_FINDER');
    expect(result.durationMs).toBe(30000);
    expect(result.confidence).toBeGreaterThan(0.9);
    expect(result.resolvedAt).toBeInstanceOf(Date);
  });

  it('pide como máximo tres resultados al proveedor', async () => {
    const search = vi.fn().mockResolvedValue(okResponse);
    await provider(search).resolve(input);
    expect(search).toHaveBeenCalledWith('Neon Nights', 'The Demo Waves', 3);
  });

  it('cachea la resolución y no vuelve a buscar', async () => {
    const search = vi.fn().mockResolvedValue(okResponse);
    const p = provider(search);
    await p.resolve(input);
    await p.resolve(input);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('devuelve NOT_FOUND cuando no hay resultados', async () => {
    const search = vi.fn().mockResolvedValue({ success: false, error: 'No songs found' });
    const result = await provider(search).resolve(input);
    expect(result.status).toBe('NOT_FOUND');
  });

  it('descarta previews de dominios no confiables', async () => {
    const search = vi.fn().mockResolvedValue({
      success: true,
      results: [{ name: 'Neon Nights - The Demo Waves', previewUrls: ['https://evil.com/a.mp3'] }],
    });
    const result = await provider(search).resolve(input);
    expect(result.status).toBe('NOT_FOUND');
  });

  it('reintenta con backoff ante rate limit y acaba devolviendo RATE_LIMITED', async () => {
    const search = vi
      .fn()
      .mockResolvedValue({ success: false, error: 'Rate limit exceeded (429)' });
    const result = await provider(search, { maxAttempts: 3 }).resolve(input);
    expect(search).toHaveBeenCalledTimes(3);
    expect(result.status).toBe('RATE_LIMITED');
  });

  it('reintenta ante fallo de red y devuelve el resultado si se recupera', async () => {
    const search = vi
      .fn()
      .mockResolvedValueOnce({ success: false, error: 'network ECONNRESET' })
      .mockResolvedValueOnce(okResponse);
    const result = await provider(search, { maxAttempts: 3 }).resolve(input);
    expect(search).toHaveBeenCalledTimes(2);
    expect(result.status).toBe('AVAILABLE');
  });

  it('marca UNREACHABLE cuando se agota el tiempo de espera', async () => {
    const search = vi.fn().mockImplementation(() => new Promise(() => undefined));
    const result = await provider(search, { maxAttempts: 2, timeoutMs: 30 }).resolve(input);
    expect(result.status).toBe('UNREACHABLE');
  });

  it('devuelve INVALID_RESPONSE si la forma no es la esperada', async () => {
    const search = vi.fn().mockResolvedValue({ unexpected: true });
    const result = await provider(search as unknown as PreviewSearchFn).resolve(input);
    expect(result.status).toBe('INVALID_RESPONSE');
  });

  it('captura errores lanzados por el paquete', async () => {
    const search = vi.fn().mockRejectedValue(new Error('faltan credenciales'));
    const result = await provider(search).resolve(input);
    expect(result.status).toBe('ERROR');
    if (result.status === 'AVAILABLE') return;
    expect(result.reason).toContain('credenciales');
  });

  it('limita la concurrencia al valor configurado', async () => {
    let active = 0;
    let maxActive = 0;
    const search = vi.fn().mockImplementation(async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 20));
      active--;
      return okResponse;
    });
    const p = provider(search, { concurrency: 2, cacheTtlMs: 0 });
    await Promise.all(
      ['A', 'B', 'C', 'D', 'E'].map((t) => p.resolve({ title: t, artist: `Artista ${t}` })),
    );
    expect(maxActive).toBeLessThanOrEqual(2);
  });
});
