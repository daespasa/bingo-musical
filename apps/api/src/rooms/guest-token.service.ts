import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { loadEnv } from '../config/env';

export type GuestTokenPayload = {
  participantId: string;
  roomId: string;
  exp: number; // epoch ms
};

/**
 * Token de invitado firmado con HMAC-SHA256, ligado a una sala y con
 * expiración. Formato: base64url(payload).base64url(firma)
 */
@Injectable()
export class GuestTokenService {
  private get secret(): string {
    return loadEnv().GUEST_TOKEN_SECRET;
  }

  sign(payload: GuestTokenPayload): string {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = createHmac('sha256', this.secret).update(body).digest('base64url');
    return `${body}.${sig}`;
  }

  verify(token: string): GuestTokenPayload | null {
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;
    const expected = createHmac('sha256', this.secret).update(body).digest();
    const provided = Buffer.from(sig, 'base64url');
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
      return null;
    }
    try {
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as GuestTokenPayload;
      if (
        typeof payload.participantId !== 'string' ||
        typeof payload.roomId !== 'string' ||
        typeof payload.exp !== 'number' ||
        payload.exp < Date.now()
      ) {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }
}
