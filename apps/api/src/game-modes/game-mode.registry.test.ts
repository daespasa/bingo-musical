import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { defaultConfigForMode } from '@bingo/shared';
import { GameModeRegistry } from './game-mode.registry';
import { MusicBingoHandler, revealedInfo } from './music-bingo.handler';
import type { ScoringSettings } from './game-mode-handler';

const registry = new GameModeRegistry(new MusicBingoHandler());

const TRACK = {
  id: 'track-1',
  title: 'Titi Me Preguntó',
  artist: 'Bad Bunny',
  previewUrl: 'https://example.test/1.mp3',
  releaseYear: 2022,
  album: 'Un Verano Sin Ti',
};

const SCORING: ScoringSettings = {
  correctMarkPoints: 100,
  speedBonusMax: 50,
  streakBonusPoints: 50,
  linePoints: 500,
  bingoPoints: 1500,
  wrongMarkPenalty: -50,
  wrongClaimPenalty: -100,
};

describe('registro de modos', () => {
  it('resuelve el handler del bingo', () => {
    expect(registry.resolve('MUSIC_BINGO').mode).toBe('MUSIC_BINGO');
  });

  it('solo declara soportado lo que tiene handler', () => {
    expect(registry.supportedModes()).toEqual(['MUSIC_BINGO']);
    expect(registry.isSupported('SURVIVAL')).toBe(false);
  });

  it('se niega a empezar una partida de un modo sin handler', () => {
    // Es preferible negarse que abrir una sala que nadie sabe conducir.
    expect(() => registry.resolve('MULTIPLE_CHOICE')).toThrow(BadRequestException);
    expect(() => registry.resolve('MULTIPLE_CHOICE')).toThrow(/Quiz musical/);
  });

  it('valida la configuración con el esquema del modo', () => {
    const config = registry.validateConfig('MUSIC_BINGO', {
      mode: 'MUSIC_BINGO',
      revealMode: 'VISIBLE_FROM_START',
    });
    expect(config.revealMode).toBe('VISIBLE_FROM_START');
  });

  it('rechaza una configuración inválida con un error de petición', () => {
    expect(() =>
      registry.validateConfig('MUSIC_BINGO', { mode: 'MUSIC_BINGO', revealMode: 'A_MEDIAS' }),
    ).toThrow(BadRequestException);
  });

  it('rechaza que la configuración declare un modo distinto al de la partida', () => {
    // El cliente no elige handler: el modo lo manda la partida persistida.
    expect(() => registry.validateConfig('MUSIC_BINGO', { mode: 'SURVIVAL', lives: 3 })).toThrow(
      BadRequestException,
    );
  });
});

describe('handler del bingo musical', () => {
  const handler = new MusicBingoHandler();

  it('a ciegas no manda título ni artista con la ronda', async () => {
    const config = defaultConfigForMode('MUSIC_BINGO');
    const round = await handler.createRound({
      roomId: 'room-1',
      config,
      index: 0,
      totalRounds: 10,
      track: TRACK,
      pool: [TRACK],
    });

    // Si esto viajara al cliente antes del reveal, se regalaría la respuesta.
    expect(round.revealed).toBeNull();
    expect(JSON.stringify(round)).not.toContain('Titi Me Preguntó');
  });

  it('revelado manda título y artista desde el primer segundo', async () => {
    const config = {
      ...defaultConfigForMode('MUSIC_BINGO'),
      revealMode: 'VISIBLE_FROM_START' as const,
    };
    const round = await handler.createRound({
      roomId: 'room-1',
      config,
      index: 0,
      totalRounds: 10,
      track: TRACK,
      pool: [TRACK],
    });

    expect(round.revealed).toEqual({ title: 'Titi Me Preguntó', artist: 'Bad Bunny' });
  });

  it('acierta solo si la casilla es la pista que suena', async () => {
    const config = defaultConfigForMode('MUSIC_BINGO');
    const base = {
      roomId: 'room-1',
      config,
      participantId: 'p1',
      round: { trackId: 'track-1', revealed: null },
      latencyMs: 1000,
    };

    expect(
      (await handler.evaluateAnswer({ ...base, answer: { cellTrackId: 'track-1' } })).correct,
    ).toBe(true);
    expect(
      (await handler.evaluateAnswer({ ...base, answer: { cellTrackId: 'otra' } })).correct,
    ).toBe(false);
    expect((await handler.evaluateAnswer({ ...base, answer: { cellTrackId: null } })).correct).toBe(
      false,
    );
  });

  it('puntúa acierto con bonus de velocidad', () => {
    const events = handler.calculateScore({
      config: defaultConfigForMode('MUSIC_BINGO'),
      participantId: 'p1',
      result: { correct: true },
      latencyMs: 0,
      streak: 0,
      windowMs: 25000,
      scoring: SCORING,
    });

    expect(events.map((e) => e.type)).toEqual(['CORRECT_MARK', 'SPEED_BONUS']);
    expect(events[0]!.points).toBe(100);
    expect(events[1]!.points).toBe(50);
  });

  it('añade bonus de racha al tercer acierto seguido', () => {
    const events = handler.calculateScore({
      config: defaultConfigForMode('MUSIC_BINGO'),
      participantId: 'p1',
      result: { correct: true },
      latencyMs: 25000,
      streak: 2,
      windowMs: 25000,
      scoring: SCORING,
    });

    expect(events.map((e) => e.type)).toEqual(['CORRECT_MARK', 'STREAK_BONUS']);
  });

  it('penaliza la marca equivocada y nada más', () => {
    const events = handler.calculateScore({
      config: defaultConfigForMode('MUSIC_BINGO'),
      participantId: 'p1',
      result: { correct: false },
      latencyMs: 500,
      streak: 5,
      windowMs: 25000,
      scoring: SCORING,
    });

    expect(events).toEqual([{ type: 'WRONG_MARK', points: -50 }]);
  });

  it('la partida termina al agotar las canciones', () => {
    const config = defaultConfigForMode('MUSIC_BINGO');
    const context = { config, totalRounds: 10, activeParticipantIds: ['p1'] };
    expect(handler.isGameFinished({ ...context, roundIndex: 9 })).toBe(false);
    expect(handler.isGameFinished({ ...context, roundIndex: 10 })).toBe(true);
  });
});

describe('revelado según la variante', () => {
  it('oculta la canción en bingo a ciegas', () => {
    expect(revealedInfo(defaultConfigForMode('MUSIC_BINGO'), TRACK)).toBeNull();
  });

  it('la enseña en bingo clásico', () => {
    const config = {
      ...defaultConfigForMode('MUSIC_BINGO'),
      revealMode: 'VISIBLE_FROM_START' as const,
    };
    expect(revealedInfo(config, TRACK)).toEqual({ title: TRACK.title, artist: TRACK.artist });
  });
});
