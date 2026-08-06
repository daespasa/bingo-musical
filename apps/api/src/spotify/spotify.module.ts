import { Logger, Module } from '@nestjs/common';
import { SpotifyPreviewFinderProvider } from '@bingo/music-providers';
import { SpotifyController } from './spotify.controller';
import { ThemesService } from './themes.service';
import { SpotifyService } from './spotify.service';
import { SpotifyApiService } from './spotify-api.service';
import { PREVIEW_PROVIDER } from './preview-provider.token';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SpotifyController],
  providers: [
    ThemesService,
    SpotifyService,
    SpotifyApiService,
    {
      provide: PREVIEW_PROVIDER,
      useFactory: () => {
        const logger = new Logger('PreviewProvider');
        return new SpotifyPreviewFinderProvider({
          concurrency: 2,
          maxAttempts: 3,
          timeoutMs: 8000,
          logger: { warn: (msg) => logger.warn(msg) },
        });
      },
    },
  ],
})
export class SpotifyModule {}
