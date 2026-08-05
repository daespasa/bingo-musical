import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { User } from '@bingo/database';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { LoginDto, RegisterDto } from './auth.dto';
import { AuthGuard, AuthenticatedRequest, CurrentUser, SESSION_COOKIE } from './auth.guard';
import { isProduction } from '../config/env';

type PublicUser = { id: string; email: string; displayName: string };

const toPublic = (u: User): PublicUser => ({
  id: u.id,
  email: u.email,
  displayName: u.displayName,
});

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

  private async issueSession(res: Response, user: User): Promise<void> {
    const { token, expiresAt } = await this.sessions.create(user.id);
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction(),
      expires: expiresAt,
      path: '/',
    });
  }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PublicUser> {
    const user = await this.auth.register(dto.email, dto.password, dto.displayName);
    await this.issueSession(res, user);
    return toPublic(user);
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PublicUser> {
    const user = await this.auth.validateCredentials(dto.email, dto.password);
    await this.issueSession(res, user);
    return toPublic(user);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: boolean }> {
    await this.sessions.destroy(req.sessionToken);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: User): PublicUser {
    return toPublic(user);
  }
}
