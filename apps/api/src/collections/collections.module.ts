import { Module } from '@nestjs/common';
import { CollectionsController } from './collections.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CollectionsController],
})
export class CollectionsModule {}
