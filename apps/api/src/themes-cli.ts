/**
 * Construye o refresca las colecciones temáticas.
 *
 *   pnpm themes:build
 *
 * Se lanza a mano a propósito: es algo que se hace de tarde en tarde, y un
 * proceso automático dentro de la API no se ejecutaría si el equipo está
 * apagado a esa hora y fallaría sin que nadie se enterase.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ThemesService } from './spotify/themes.service';

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const outcomes = await app.get(ThemesService).buildAll();

    console.log('\nColecciones temáticas\n');
    for (const outcome of outcomes) {
      if (outcome.status === 'built') {
        console.log(
          `  ✓ ${outcome.key}: ${outcome.playable} canciones (${outcome.discarded} descartadas por no sonar)`,
        );
      } else if (outcome.status === 'kept') {
        console.log(`  · ${outcome.key}: se conserva la anterior (${outcome.reason})`);
      } else {
        console.log(`  ✗ ${outcome.key}: ${outcome.reason}`);
      }
    }

    const built = outcomes.filter((o) => o.status === 'built').length;
    console.log(`\n${built} de ${outcomes.length} temáticas actualizadas.\n`);
    // Que ninguna se actualice es un fallo: sirve para enterarse en un script
    process.exitCode = built === 0 ? 1 : 0;
  } finally {
    await app.close();
  }
}

void main();
