import { Module } from '@nestjs/common';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { GuestTokenService } from './guest-token.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [RoomsController],
  providers: [RoomsService, GuestTokenService],
  exports: [RoomsService, GuestTokenService],
})
export class RoomsModule {}
