import { PrismaClient, RoomStatus, RoomMode, GameStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomUUID } from 'node:crypto';

const prisma = new PrismaClient();

/**
 * Catálogo demo. Nada de esto es música comercial: son piezas sintetizadas
 * por `scripts/generate-demo-audio.mjs`, con metadatos inventados.
 *
 * Los años están repartidos a propósito entre cinco décadas, con cuatro pistas
 * en cada una. Sin ese reparto, las preguntas de década se quedarían sin
 * distractores creíbles y el quiz sería trivial.
 */
const DEMO_TRACKS: Array<{ title: string; artist: string; releaseYear: number }> = [
  { title: 'Neon Nights', artist: 'The Demo Waves', releaseYear: 1983 },
  { title: 'Luna de Verano', artist: 'Los Sintéticos', releaseYear: 1986 },
  { title: 'Electric Sunrise', artist: 'The Demo Waves', releaseYear: 1989 },
  { title: 'Bailando en Marte', artist: 'Cohete 9', releaseYear: 1981 },
  { title: 'Midnight Circuit', artist: 'Pixel Orchestra', releaseYear: 1994 },
  { title: 'Corazón de Chip', artist: 'Los Sintéticos', releaseYear: 1997 },
  { title: 'Golden Frequency', artist: 'Analog Dreams', releaseYear: 1991 },
  { title: 'Viento del Norte', artist: 'Aurora Beat', releaseYear: 1999 },
  { title: 'Silver Echoes', artist: 'Pixel Orchestra', releaseYear: 2003 },
  { title: 'Ruta 404', artist: 'Cohete 9', releaseYear: 2007 },
  { title: 'Crystal Rain', artist: 'Analog Dreams', releaseYear: 2001 },
  { title: 'Fuego Lento', artist: 'Aurora Beat', releaseYear: 2009 },
  { title: 'Binary Sunset Club', artist: 'Pixel Orchestra', releaseYear: 2012 },
  { title: 'Mar de Cables', artist: 'Los Sintéticos', releaseYear: 2015 },
  { title: 'Gravity Waltz', artist: 'The Demo Waves', releaseYear: 2018 },
  { title: 'Ciudad Neón', artist: 'Aurora Beat', releaseYear: 2011 },
  { title: 'Phantom Groove', artist: 'Analog Dreams', releaseYear: 2021 },
  { title: 'Salto Cuántico', artist: 'Cohete 9', releaseYear: 2023 },
  { title: 'Velvet Static', artist: 'The Demo Waves', releaseYear: 2020 },
  { title: 'Último Tren', artist: 'Aurora Beat', releaseYear: 2024 },
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

async function main(): Promise<void> {
  console.log('🌱 Seeding…');

  // --- Usuario demo ---
  const passwordHash = await argon2.hash('Demo1234!', { type: argon2.argon2id });
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@bingo.local' },
    update: {},
    create: {
      email: 'demo@bingo.local',
      passwordHash,
      displayName: 'Anfitrión Demo',
    },
  });

  // --- Pistas demo + colección ---
  const trackIds: string[] = [];
  for (let i = 0; i < DEMO_TRACKS.length; i++) {
    const t = DEMO_TRACKS[i]!;
    const artist = await prisma.artist.upsert({
      where: { normalizedName: normalize(t.artist) },
      update: {},
      create: { name: t.artist, normalizedName: normalize(t.artist) },
    });
    const existing = await prisma.track.findFirst({
      where: { normalizedTitle: normalize(t.title), artistId: artist.id },
    });
    // Las pistas ya creadas también reciben el año: si solo se pusiera al
    // crear, las instalaciones anteriores se quedarían sin metadatos y las
    // preguntas de año y década no tendrían con qué trabajar.
    const track = existing
      ? await prisma.track.update({
          where: { id: existing.id },
          data: { releaseYear: t.releaseYear },
        })
      : await prisma.track.create({
          data: {
            title: t.title,
            normalizedTitle: normalize(t.title),
            artistId: artist.id,
            durationMs: 17000,
            releaseYear: t.releaseYear,
            source: 'DEMO',
          },
        });
    await prisma.trackPreview.upsert({
      where: { trackId_provider: { trackId: track.id, provider: 'DEMO_LOCAL' } },
      update: {},
      create: {
        trackId: track.id,
        provider: 'DEMO_LOCAL',
        status: 'AVAILABLE',
        url: `/audio/demo-${String(i + 1).padStart(2, '0')}.wav`,
        durationMs: 17000,
        confidence: 1,
        lastValidatedAt: new Date(),
      },
    });
    trackIds.push(track.id);
  }

  let collection = await prisma.musicCollection.findFirst({ where: { isDemo: true } });
  if (!collection) {
    collection = await prisma.musicCollection.create({
      data: {
        name: 'Colección Demo',
        description: '20 pistas sintetizadas libres de derechos para probar el bingo musical.',
        isDemo: true,
        tracks: {
          create: trackIds.map((trackId, position) => ({ trackId, position })),
        },
      },
    });
  }

  // --- Partida lista para jugar ---
  const readyGame = await prisma.game.findFirst({
    where: { ownerId: demoUser.id, name: 'Mi primera partida demo' },
  });
  if (!readyGame) {
    await prisma.game.create({
      data: {
        name: 'Mi primera partida demo',
        status: GameStatus.READY,
        ownerId: demoUser.id,
        collectionId: collection.id,
        settings: { create: {} },
      },
    });
  }

  // --- Partida terminada con historial ---
  const finished = await prisma.game.findFirst({
    where: { ownerId: demoUser.id, name: 'Fiesta de ejemplo (terminada)' },
  });
  if (!finished) {
    const game = await prisma.game.create({
      data: {
        name: 'Fiesta de ejemplo (terminada)',
        status: GameStatus.ARCHIVED,
        ownerId: demoUser.id,
        collectionId: collection.id,
        settings: { create: {} },
      },
    });
    const room = await prisma.room.create({
      data: {
        code: 'DEMO01',
        gameId: game.id,
        hostId: demoUser.id,
        mode: RoomMode.REMOTE,
        status: RoomStatus.FINISHED,
        startedAt: new Date(Date.now() - 3600_000),
        finishedAt: new Date(Date.now() - 3000_000),
        expiresAt: new Date(Date.now() - 2000_000),
      },
    });
    const aliases = ['Marta', 'Leo', 'Vega'];
    const participants = [] as { id: string; alias: string }[];
    for (const alias of aliases) {
      const p = await prisma.roomParticipant.create({
        data: {
          roomId: room.id,
          alias,
          aliasNormalized: normalize(alias),
          playerSessions: {
            create: {
              tokenHash: sha256(randomUUID()),
              expiresAt: new Date(Date.now() - 2000_000),
            },
          },
        },
      });
      participants.push({ id: p.id, alias });
    }
    const scores = [2450, 1800, 950];
    await prisma.gameResult.create({
      data: {
        roomId: room.id,
        winnerParticipantId: participants[0]!.id,
        totalRounds: 10,
        durationMs: 600_000,
        summary: {
          ranking: participants.map((p, i) => ({
            participantId: p.id,
            alias: p.alias,
            score: scores[i],
            position: i + 1,
          })),
          lines: [{ alias: 'Leo', roundIndex: 6 }],
          bingo: { alias: 'Marta', roundIndex: 9 },
        },
      },
    });
    await prisma.highlight.createMany({
      data: [
        {
          roomId: room.id,
          participantId: participants[0]!.id,
          type: 'BINGO',
          roundIndex: 9,
        },
        {
          roomId: room.id,
          participantId: participants[1]!.id,
          type: 'FIRST_LINE',
          roundIndex: 6,
        },
        {
          roomId: room.id,
          participantId: participants[2]!.id,
          type: 'FASTEST_ANSWER',
          roundIndex: 2,
          data: { latencyMs: 1420 },
        },
      ],
    });
  }

  console.log('✅ Seed completado: demo@bingo.local / Demo1234!');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
