import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { loadEnv, isProduction } from './config/env';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  if (isProduction()) {
    // Detrás de Cloudflare Tunnel / proxy inverso
    app.set('trust proxy', 1);
  }

  app.use(cookieParser(env.SESSION_SECRET));
  app.enableCors({
    origin: env.WEB_URL,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  const swagger = new DocumentBuilder()
    .setTitle('Bingo Musical API')
    .setDescription('API REST y WebSocket del bingo musical')
    .setVersion('0.1.0')
    .addCookieAuth('bingo_session')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));

  await app.listen(env.API_PORT);
  Logger.log(`API escuchando en http://localhost:${env.API_PORT} (docs en /docs)`, 'Bootstrap');
}

void bootstrap();
