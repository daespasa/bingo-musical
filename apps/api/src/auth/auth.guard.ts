import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '@bingo/database';
import { SessionService } from './session.service';

export const SESSION_COOKIE = 'bingo_session';

export interface AuthenticatedRequest extends Request {
  user: User;
  sessionToken: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
    if (!token) throw new UnauthorizedException('Sesión no iniciada');
    const user = await this.sessions.resolve(token);
    if (!user) throw new UnauthorizedException('Sesión inválida o caducada');
    req.user = user;
    req.sessionToken = token;
    return true;
  }
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): User => {
  return ctx.switchToHttp().getRequest<AuthenticatedRequest>().user;
});
