import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { User } from '@bingo/database';
import { SessionService } from './session.service';
import { isProduction } from '../config/env';

export const SESSION_COOKIE = 'bingo_session';

export interface AuthenticatedRequest extends Request {
  user: User;
  sessionToken: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest<AuthenticatedRequest>();
    const token = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
    if (!token) throw new UnauthorizedException('Sesión no iniciada');

    const resolved = await this.sessions.resolve(token);
    if (!resolved) throw new UnauthorizedException('Sesión inválida o caducada');

    req.user = resolved.user;
    req.sessionToken = token;

    // Renovación deslizante: refrescamos también la caducidad de la cookie
    if (resolved.renewedUntil) {
      http.getResponse<Response>().cookie(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction(),
        expires: resolved.renewedUntil,
        path: '/',
      });
    }
    return true;
  }
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): User => {
  return ctx.switchToHttp().getRequest<AuthenticatedRequest>().user;
});
