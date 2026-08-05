import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { User } from '@bingo/database';
import { PrismaService } from '../prisma.service';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 días

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async create(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.prisma.session.create({
      data: { userId, tokenHash: this.hash(token), expiresAt },
    });
    return { token, expiresAt };
  }

  async resolve(token: string): Promise<User | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: this.hash(token) },
      include: { user: true },
    });
    if (!session) return null;
    if (session.expiresAt.getTime() < Date.now()) {
      await this.prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      return null;
    }
    return session.user;
  }

  async destroy(token: string): Promise<void> {
    await this.prisma.session
      .delete({ where: { tokenHash: this.hash(token) } })
      .catch(() => undefined);
  }
}
