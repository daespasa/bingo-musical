import { normalizeText } from '@bingo/shared';
import type { PreviewProvider, PreviewResolution } from './preview-provider';
import { pickBestCandidate, type MatchCandidate } from './matching';

/**
 * Firma del paquete `spotify-preview-finder`, que tratamos como proveedor
 * experimental y reemplazable: nada fuera de este archivo lo conoce.
 */
export type PreviewSearchFn = (
  songName: string,
  artist: string,
  limit: number,
) => Promise<{
  success: boolean;
  error?: string;
  results?: Array<{
    name: string;
    trackId?: string;
    durationMs?: number;
    previewUrls?: string[];
  }>;
}>;

export type SpotifyPreviewFinderOptions = {
  /** Búsqueda inyectable; por defecto carga el paquete real. */
  search?: PreviewSearchFn;
  /** Milisegundos antes de abortar un intento. */
  timeoutMs?: number;
  /** Intentos totales por resolución (incluido el primero). */
  maxAttempts?: number;
  /** Espera base del backoff exponencial. */
  backoffMs?: number;
  /** Resoluciones simultáneas como máximo. */
  concurrency?: number;
  /** Milisegundos que una resolución permanece en caché. */
  cacheTtlMs?: number;
  /** Resultados a pedir al proveedor por búsqueda. */
  resultLimit?: number;
  logger?: { warn: (msg: string) => void; debug?: (msg: string) => void };
};

const DEFAULTS = {
  timeoutMs: 8000,
  maxAttempts: 3,
  backoffMs: 500,
  concurrency: 2,
  cacheTtlMs: 1000 * 60 * 60 * 24,
  resultLimit: 3,
};

/** Error que fuerza reintento con backoff. */
class RetryableError extends Error {
  constructor(
    message: string,
    readonly status: 'RATE_LIMITED' | 'UNREACHABLE',
  ) {
    super(message);
  }
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Semáforo simple para limitar la concurrencia de salida. */
class Semaphore {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  async acquire(): Promise<() => void> {
    if (this.active >= this.limit) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.active++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active--;
      this.queue.shift()?.();
    };
  }
}

/**
 * Resuelve previews de 30 s a partir del título y el artista.
 *
 * Encapsula por completo `spotify-preview-finder`: controla timeout, caché,
 * reintentos con backoff exponencial, límite de concurrencia y validación de
 * la URL resultante antes de darla por buena.
 */
export class SpotifyPreviewFinderProvider implements PreviewProvider {
  private readonly options: Required<Omit<SpotifyPreviewFinderOptions, 'search' | 'logger'>>;
  private readonly cache = new Map<string, { value: PreviewResolution; expiresAt: number }>();
  private readonly semaphore: Semaphore;
  private readonly logger: NonNullable<SpotifyPreviewFinderOptions['logger']>;
  private search: PreviewSearchFn | null;

  constructor(options: SpotifyPreviewFinderOptions = {}) {
    this.options = {
      timeoutMs: options.timeoutMs ?? DEFAULTS.timeoutMs,
      maxAttempts: options.maxAttempts ?? DEFAULTS.maxAttempts,
      backoffMs: options.backoffMs ?? DEFAULTS.backoffMs,
      concurrency: options.concurrency ?? DEFAULTS.concurrency,
      cacheTtlMs: options.cacheTtlMs ?? DEFAULTS.cacheTtlMs,
      resultLimit: options.resultLimit ?? DEFAULTS.resultLimit,
    };
    this.search = options.search ?? null;
    this.semaphore = new Semaphore(this.options.concurrency);
    this.logger = options.logger ?? { warn: () => undefined };
  }

  /** Carga perezosa del paquete real (CommonJS, sin tipos propios). */
  private async resolveSearchFn(): Promise<PreviewSearchFn> {
    if (this.search) return this.search;
    const mod: unknown = await import('spotify-preview-finder');
    const fn = (typeof mod === 'function' ? mod : (mod as { default?: unknown }).default) as
      PreviewSearchFn | undefined;
    if (typeof fn !== 'function') {
      throw new Error('spotify-preview-finder no exporta una función invocable');
    }
    this.search = fn;
    return fn;
  }

  private cacheKey(input: { spotifyTrackId?: string; title: string; artist: string }): string {
    return input.spotifyTrackId
      ? `id:${input.spotifyTrackId}`
      : `q:${normalizeText(input.title)}|${normalizeText(input.artist)}`;
  }

  private withTimeout<T>(promise: Promise<T>): Promise<T> {
    return Promise.race([
      promise,
      sleep(this.options.timeoutMs).then(() => {
        throw new RetryableError('Tiempo de espera agotado', 'UNREACHABLE');
      }),
    ]);
  }

  async resolve(input: {
    spotifyTrackId?: string;
    title: string;
    artist: string;
    durationMs?: number;
  }): Promise<PreviewResolution> {
    const key = this.cacheKey(input);
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const release = await this.semaphore.acquire();
    try {
      const result = await this.attemptWithRetries(input);
      if (result.status === 'AVAILABLE' || result.status === 'NOT_FOUND') {
        this.cache.set(key, { value: result, expiresAt: Date.now() + this.options.cacheTtlMs });
      }
      return result;
    } finally {
      release();
    }
  }

  private async attemptWithRetries(input: {
    spotifyTrackId?: string;
    title: string;
    artist: string;
    durationMs?: number;
  }): Promise<PreviewResolution> {
    let lastRetryable: RetryableError | null = null;

    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt++) {
      try {
        return await this.attemptOnce(input);
      } catch (err) {
        if (err instanceof RetryableError) {
          lastRetryable = err;
          this.logger.warn(
            `preview "${input.title}" intento ${attempt}/${this.options.maxAttempts}: ${err.message}`,
          );
          if (attempt < this.options.maxAttempts) {
            await sleep(this.options.backoffMs * 2 ** (attempt - 1));
            continue;
          }
          break;
        }
        return { status: 'ERROR', reason: (err as Error).message };
      }
    }
    return {
      status: lastRetryable?.status ?? 'ERROR',
      reason: lastRetryable?.message ?? 'Fallo desconocido',
    };
  }

  private async attemptOnce(input: {
    spotifyTrackId?: string;
    title: string;
    artist: string;
    durationMs?: number;
  }): Promise<PreviewResolution> {
    const search = await this.resolveSearchFn();
    const response = await this.withTimeout(
      search(input.title, input.artist, this.options.resultLimit),
    );

    if (!response || typeof response !== 'object' || !('success' in response)) {
      return { status: 'INVALID_RESPONSE', reason: 'Respuesta sin forma esperada' };
    }
    if (!response.success) {
      const reason = response.error ?? 'Búsqueda sin éxito';
      if (/rate ?limit|429|too many/i.test(reason)) {
        throw new RetryableError(reason, 'RATE_LIMITED');
      }
      if (/network|timeout|ECONN|ENOTFOUND|socket/i.test(reason)) {
        throw new RetryableError(reason, 'UNREACHABLE');
      }
      return { status: 'NOT_FOUND', reason };
    }

    const candidates: MatchCandidate[] = (response.results ?? []).map((r) => ({
      name: r.name ?? '',
      trackId: r.trackId,
      durationMs: r.durationMs,
      previewUrls: r.previewUrls ?? [],
    }));
    if (candidates.length === 0) {
      return { status: 'NOT_FOUND', reason: 'Sin resultados' };
    }

    const best = pickBestCandidate(input, candidates);
    if (!best) {
      return { status: 'NOT_FOUND', reason: 'Ningún resultado tenía una preview válida' };
    }

    return {
      status: 'AVAILABLE',
      provider: 'SPOTIFY_PREVIEW_FINDER',
      url: best.url,
      durationMs: 30000,
      confidence: Number(best.confidence.toFixed(3)),
      resolvedAt: new Date(),
    };
  }
}
