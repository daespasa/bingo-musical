import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { User } from '@bingo/database';
import { PrismaService } from '../prisma.service';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 días
/** Solo renovamos si ya se consumió un día, para no escribir en cada petición. */
const SLIDING_RENEWAL_THRESHOLD_MS = 1000 * 60 * 60 * 24;

export type SessionContext = { userAgent?: string; ip?: string };

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  async create(
    userId: string,
    context: SessionContext = {},
  ): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: this.hash(token),
        expiresAt,
        userAgent: context.userAgent?.slice(0, 255),
        // Guardamos solo el hash de la IP: sirve para auditoría sin retener el dato
        ipHash: context.ip ? this.hash(context.ip).slice(0, 32) : null,
      },
    });
    await this.prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
    return { token, expiresAt };
  }

  /**
   * Resuelve la sesión y la renueva de forma deslizante: mientras se use, la
   * caducidad se aleja, de modo que el anfitrión no pierde la sesión entre
   * partidas. Las sesiones caducadas se eliminan al detectarlas.
   */
  async resolve(token: string): Promise<{ user: User; renewedUntil: Date | null } | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: this.hash(token) },
      include: { user: true },
    });
    if (!session) return null;

    if (session.expiresAt.getTime() < Date.now()) {
      await this.prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      return null;
    }

    const usedMs = Date.now() - session.lastSeenAt.getTime();
    if (usedMs < SLIDING_RENEWAL_THRESHOLD_MS) {
      return { user: session.user, renewedUntil: null };
    }

    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.prisma.session.update({
      where: { id: session.id },
      data: { expiresAt, lastSeenAt: new Date() },
    });
    return { user: session.user, renewedUntil: expiresAt };
  }

  async destroy(token: string): Promise<void> {
    await this.prisma.session
      .delete({ where: { tokenHash: this.hash(token) } })
      .catch(() => undefined);
  }

  /** Cierra el resto de sesiones del usuario (cambio de contraseña, robo…). */
  async destroyOthers(userId: string, keepToken: string): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: { userId, tokenHash: { not: this.hash(keepToken) } },
    });
    return result.count;
  }

  /** Limpieza de sesiones caducadas; se invoca desde tareas de mantenimiento. */
  async purgeExpired(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }
}
