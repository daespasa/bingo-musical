import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { GoogleOAuthService } from './google-oauth.service';

const service = new GoogleOAuthService();

describe('GoogleOAuthService state', () => {
  it('acepta un state recién creado', () => {
    expect(service.verifyState(service.createState())).toBe(true);
  });

  it('rechaza un state ausente o mal formado', () => {
    expect(service.verifyState(undefined)).toBe(false);
    expect(service.verifyState('')).toBe(false);
    expect(service.verifyState('solo.dos')).toBe(false);
    expect(service.verifyState('a.b.c.d')).toBe(false);
  });

  it('rechaza un state con la firma manipulada', () => {
    const state = service.createState();
    const [issuedAt, nonce] = state.split('.');
    expect(service.verifyState(`${issuedAt}.${nonce}.firmaFalsa`)).toBe(false);
  });

  it('rechaza un state cuyo contenido se ha alterado', () => {
    const state = service.createState();
    const parts = state.split('.');
    expect(service.verifyState(`${Number(parts[0]) + 1}.${parts[1]}.${parts[2]}`)).toBe(false);
  });

  it('caduca el state pasados diez minutos', () => {
    vi.useFakeTimers();
    try {
      const state = service.createState();
      vi.advanceTimersByTime(9 * 60 * 1000);
      expect(service.verifyState(state)).toBe(true);
      vi.advanceTimersByTime(2 * 60 * 1000);
      expect(service.verifyState(state)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('GoogleOAuthService configuración', () => {
  const originalId = process.env.GOOGLE_CLIENT_ID;
  const originalSecret = process.env.GOOGLE_CLIENT_SECRET;

  beforeEach(() => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
  });

  afterEach(() => {
    if (originalId) process.env.GOOGLE_CLIENT_ID = originalId;
    if (originalSecret) process.env.GOOGLE_CLIENT_SECRET = originalSecret;
  });

  it('no se considera configurado sin credenciales', () => {
    // loadEnv cachea la configuración, así que comprobamos el valor efectivo
    // que expone el servicio en este entorno de test (sin credenciales).
    expect(service.isConfigured()).toBe(false);
  });

  it('lanza al pedir la URL de autorización sin credenciales', () => {
    expect(() => service.authorizationUrl('x')).toThrow(/no está configurado/i);
  });
});
