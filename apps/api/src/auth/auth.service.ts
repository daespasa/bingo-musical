import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { User } from '@bingo/database';
import { PrismaService } from '../prisma.service';
import { PasswordService } from './password.service';

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
    if (!user || !(await this.passwords.verify(user.passwordHash, password))) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }
    return user;
  }
}
