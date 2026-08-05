import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { User } from '@bingo/database';
import { PrismaService } from '../prisma.service';
import { PasswordService } from './password.service';
import type { GoogleProfile } from './google-oauth.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  async register(email: string, password: string, displayName: string): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con ese correo');
    }
    const passwordHash = await this.passwords.hash(password);
    return this.prisma.user.create({
      data: { email: normalizedEmail, passwordHash, displayName: displayName.trim() },
    });
  }

  async validateCredentials(email: string, password: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user?.passwordHash || !(await this.passwords.verify(user.passwordHash, password))) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }
    return user;
  }

  /**
   * Vincula o crea la cuenta a partir del perfil de Google.
   *
   * Si el correo ya existe con contraseña local, se enlaza la identidad de
   * Google a esa misma cuenta: el usuario podrá entrar de las dos formas.
   */
  async upsertGoogleUser(profile: GoogleProfile): Promise<User> {
    const byGoogleId = await this.prisma.user.findUnique({
      where: { googleId: profile.googleId },
    });
    if (byGoogleId) {
      return this.prisma.user.update({
        where: { id: byGoogleId.id },
        data: { avatarUrl: profile.avatarUrl, displayName: profile.displayName },
      });
    }

    const byEmail = await this.prisma.user.findUnique({ where: { email: profile.email } });
    if (byEmail) {
      return this.prisma.user.update({
        where: { id: byEmail.id },
        data: {
          googleId: profile.googleId,
          avatarUrl: profile.avatarUrl ?? byEmail.avatarUrl,
          emailVerified: byEmail.emailVerified || profile.emailVerified,
        },
      });
    }

    return this.prisma.user.create({
      data: {
        email: profile.email,
        displayName: profile.displayName,
        googleId: profile.googleId,
        avatarUrl: profile.avatarUrl,
        emailVerified: profile.emailVerified,
      },
    });
  }
}
