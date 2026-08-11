import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Game, User } from '@bingo/database';
import { AuthGuard, CurrentUser } from '../auth/auth.guard';
import { GamesService } from './games.service';
import { CreateGameDto } from './games.dto';

@ApiTags('games')
@Controller('games')
@UseGuards(AuthGuard)
export class GamesController {
  constructor(private readonly games: GamesService) {}

  // El tipo de retorno se anota a mano: `Game` incluye `modeConfig`, y el
  // `JsonValue` de Prisma no se puede nombrar desde aquí al inferirlo.
  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateGameDto): Promise<Game> {
    return this.games.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: User) {
    return this.games.listForOwner(user.id);
  }

  @Get('history')
  history(@CurrentUser() user: User) {
    return this.games.history(user.id);
  }

  @Get(':id')
  detail(@CurrentUser() user: User, @Param('id') id: string) {
    return this.games.detail(user.id, id);
  }

  @Post(':id/duplicate')
  duplicate(@CurrentUser() user: User, @Param('id') id: string): Promise<Game> {
    return this.games.duplicate(user.id, id);
  }
}
