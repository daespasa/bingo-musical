import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Ip,
  Logger,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { User } from '@bingo/database';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { GoogleOAuthService } from './google-oauth.service';
import { ChangePasswordDto, LoginDto, RegisterDto, UpdateProfileDto } from './auth.dto';
import { AuthGuard, AuthenticatedRequest, CurrentUser, SESSION_COOKIE } from './auth.guard';
import { isProduction, loadEnv } from '../config/env';

const OAUTH_STATE_COOKIE = 'bingo_oauth_state';

type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  hasPassword: boolean;
  linkedGoogle: boolean;
};

const toPublic = (u: User): PublicUser => ({
  id: u.id,
  email: u.email,
  displayName: u.displayName,
  avatarUrl: u.avatarUrl,
  hasPassword: u.passwordHash !== null,
  linkedGoogle: u.googleId !== null,
});

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    private readonly google: GoogleOAuthService,
  ) {}

  private async issueSession(
    res: Response,
    user: User,
    context: { userAgent?: string; ip?: string },
  ): Promise<void> {
    const { token, expiresAt } = await this.sessions.create(user.id, context);
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction(),
      expires: expiresAt,
      path: '/',
    });
  }

  /** Indica a la web qué métodos de acceso ofrece este servidor. */
  @Get('providers')
  providers(): { password: boolean; google: boolean } {
    return { password: true, google: this.google.isConfigured() };
  }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
    @Headers('user-agent') userAgent?: string,
    @Ip() ip?: string,
  ): Promise<PublicUser> {
    const user = await this.auth.register(dto.email, dto.password, dto.displayName);
    await this.issueSession(res, user, { userAgent, ip });
    return toPublic(user);
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Headers('user-agent') userAgent?: string,
    @Ip() ip?: string,
  ): Promise<PublicUser> {
    const user = await this.auth.validateCredentials(dto.email, dto.password);
    await this.issueSession(res, user, { userAgent, ip });
    return toPublic(user);
  }

  /** Paso 1 del flujo OAuth: redirige a Google con un state firmado. */
  @Get('google')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  startGoogle(@Res() res: Response): void {
    const state = this.google.createState();
    res.cookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction(),
      maxAge: 10 * 60 * 1000,
      path: '/auth',
    });
    res.redirect(this.google.authorizationUrl(state));
  }

  /** Paso 2: Google vuelve con el código; validamos el state y creamos sesión. */
  @Get('google/callback')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async googleCallback(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('error') error?: string,
    @Headers('user-agent') userAgent?: string,
    @Ip() ip?: string,
  ): Promise<void> {
    const webUrl = loadEnv().WEB_URL;
    res.clearCookie(OAUTH_STATE_COOKIE, { path: '/auth' });

    const cookieState = (req.cookies as Record<string, string> | undefined)?.[OAUTH_STATE_COOKIE];
    const fail = (reason: string): void => {
      this.logger.warn(`Callback de Google rechazado: ${reason}`);
      res.redirect(`${webUrl}/login?error=google`);
    };

    if (error) return fail(`Google devolvió error=${error}`);
    if (!code) return fail('sin código de autorización');
    if (!state || state !== cookieState || !this.google.verifyState(state)) {
      return fail('state inválido o caducado');
    }

    try {
      const profile = await this.google.exchangeCode(code);
      const user = await this.auth.upsertGoogleUser(profile);
      await this.issueSession(res, user, { userAgent, ip });
      res.redirect(`${webUrl}/dashboard`);
    } catch (err) {
      fail((err as Error).message);
    }
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

  /** Cierra el resto de dispositivos manteniendo el actual. */
  @Post('logout-others')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async logoutOthers(@Req() req: AuthenticatedRequest): Promise<{ closed: number }> {
    const closed = await this.sessions.destroyOthers(req.user.id, req.sessionToken);
    return { closed };
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ): Promise<PublicUser> {
    const user = await this.auth.updateProfile(req.user.id, dto.displayName);
    return toPublic(user);
  }

  @Post('change-password')
  @UseGuards(AuthGuard)
  @HttpCode(204)
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.auth.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: User): PublicUser {
    return toPublic(user);
  }
}
