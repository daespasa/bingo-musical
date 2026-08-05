import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { loadEnv } from '../config/env';

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';
const STATE_TTL_MS = 10 * 60 * 1000;

export type GoogleProfile = {
  googleId: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  avatarUrl: string | null;
};

/**
 * Flujo OAuth 2.0 Authorization Code contra Google, sin dependencias
 * externas ni servicios de pago. El client secret nunca sale del backend.
 */
@Injectable()
export class GoogleOAuthService {
  private readonly logger = new Logger(GoogleOAuthService.name);

  isConfigured(): boolean {
    const env = loadEnv();
    return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'El inicio de sesión con Google no está configurado en este servidor',
      );
    }
  }

  private redirectUri(): string {
    return `${loadEnv().API_URL}/auth/google/callback`;
  }

  /**
   * State firmado con HMAC y caducidad: protege el callback frente a CSRF
   * sin necesidad de almacenamiento de servidor.
   */
  createState(): string {
    const payload = `${Date.now()}.${randomBytes(16).toString('base64url')}`;
    const signature = createHmac('sha256', loadEnv().SESSION_SECRET)
      .update(payload)
      .digest('base64url');
    return `${payload}.${signature}`;
  }

  verifyState(state: string | undefined): boolean {
    if (!state) return false;
    const parts = state.split('.');
    if (parts.length !== 3) return false;
    const [issuedAt, nonce, signature] = parts as [string, string, string];
    const expected = createHmac('sha256', loadEnv().SESSION_SECRET)
      .update(`${issuedAt}.${nonce}`)
      .digest();
    const provided = Buffer.from(signature, 'base64url');
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
      return false;
    }
    const age = Date.now() - Number(issuedAt);
    return Number.isFinite(age) && age >= 0 && age < STATE_TTL_MS;
  }

  authorizationUrl(state: string): string {
    this.assertConfigured();
    const params = new URLSearchParams({
      client_id: loadEnv().GOOGLE_CLIENT_ID,
      redirect_uri: this.redirectUri(),
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account',
    });
    return `${AUTH_ENDPOINT}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<GoogleProfile> {
    this.assertConfigured();
    const env = loadEnv();

    const tokenRes = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: this.redirectUri(),
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!tokenRes.ok) {
      this.logger.error(`Intercambio de código con Google falló: ${tokenRes.status}`);
      throw new ServiceUnavailableException('Google rechazó el código de autorización');
    }
    const token = (await tokenRes.json()) as { access_token?: string };
    if (!token.access_token) {
      throw new ServiceUnavailableException('Google no devolvió un token de acceso');
    }

    const userRes = await fetch(USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${token.access_token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!userRes.ok) {
      throw new ServiceUnavailableException('No se pudo leer el perfil de Google');
    }
    const profile = (await userRes.json()) as {
      sub: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };
    if (!profile.email) {
      throw new ServiceUnavailableException('La cuenta de Google no expone un correo');
    }

    return {
      googleId: profile.sub,
      email: profile.email.toLowerCase(),
      emailVerified: profile.email_verified ?? false,
      displayName: profile.name?.slice(0, 40) || profile.email.split('@')[0]!,
      avatarUrl: profile.picture ?? null,
    };
  }
}
