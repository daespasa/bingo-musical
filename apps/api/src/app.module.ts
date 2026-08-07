import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { CollectionsModule } from './collections/collections.module';
import { GamesModule } from './games/games.module';
import { GameModesModule } from './game-modes/game-modes.module';
import { RoomsModule } from './rooms/rooms.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SpotifyModule } from './spotify/spotify.module';
import { HealthController } from './health/health.controller';
import { PrismaService } from './prisma.service';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    GameModesModule,
    AuthModule,
    CollectionsModule,
    GamesModule,
    RoomsModule,
    RealtimeModule,
    SpotifyModule,
  ],
  controllers: [HealthController],
  providers: [PrismaService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
