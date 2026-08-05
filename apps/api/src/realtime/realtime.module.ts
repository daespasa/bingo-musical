import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { GameEngineService } from './game-engine.service';
import { CardsService } from './cards.service';
import { RoomStateService } from './room-state.service';
import { RoomsModule } from '../rooms/rooms.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, RoomsModule],
  providers: [GameGateway, GameEngineService, CardsService, RoomStateService],
})
export class RealtimeModule {}
