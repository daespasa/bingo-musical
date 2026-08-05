import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { User } from '@bingo/database';
import { AuthGuard, CurrentUser } from '../auth/auth.guard';
import { RoomsService } from './rooms.service';
import { CreateRoomDto, JoinRoomDto } from './rooms.dto';

@ApiTags('rooms')
@Controller('rooms')
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Post()
  @UseGuards(AuthGuard)
  create(@CurrentUser() user: User, @Body() dto: CreateRoomDto) {
    return this.rooms.create(user.id, dto.gameId, dto.mode);
  }

  @Get(':code')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  find(@Param('code') code: string) {
    return this.rooms.findByCode(code);
  }

  @Post(':code/join')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  join(
    @Param('code') code: string,
    @Body() dto: JoinRoomDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.rooms.join(code, dto.alias, userAgent);
  }

  @Get(':code/result')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  result(@Param('code') code: string): Promise<Record<string, unknown>> {
    return this.rooms.result(code);
  }

  @Post(':code/host-session')
  @UseGuards(AuthGuard)
  async hostSession(@CurrentUser() user: User, @Param('code') code: string) {
    const { room, participantId, token } = await this.rooms.ensureHostParticipant(user.id, code);
    return { roomId: room.id, code: room.code, mode: room.mode, participantId, token };
  }
}
