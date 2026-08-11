import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { randomUUID } from 'node:crypto';
import { REACTIONS } from '@bingo/shared';
import type {
  MarkCellAck,
  MarkCellRequest,
  SubmitAnswerAck,
  SubmitAnswerRequest,
  SubmitTextAnswerAck,
  SubmitTextAnswerRequest,
} from '@bingo/shared';

/** Una reacción por jugador cada tres segundos: anima, no inunda. */
const REACTION_COOLDOWN_MS = 3000;
/**
 * Enfriamiento entre respuestas escritas.
 *
 * Corto para no estorbar a quien escribe deprisa, suficiente para que probar
 * el diccionario entero durante la ventana de respuesta no sea viable.
 */
const TEXT_ANSWER_COOLDOWN_MS = 900;
import { PrismaService } from '../prisma.service';
import { GuestTokenService } from '../rooms/guest-token.service';
import { GameEngineService } from './game-engine.service';
import { RoomStateService } from './room-state.service';

type SocketData = {
  participantId: string;
  roomId: string;
  role: 'HOST' | 'PLAYER' | 'SCREEN';
};

@WebSocketGateway({ namespace: '/rooms' })
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(GameGateway.name);
  @WebSocketServer() server!: Server;

  /** participantIds conectados por sala (presencia). */
  private readonly presence = new Map<string, Set<string>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly guestTokens: GuestTokenService,
    private readonly engine: GameEngineService,
    private readonly roomState: RoomStateService,
  ) {}

  afterInit(): void {
    this.engine.bindEmitter({
      toRoom: (event, payload) => {
        const roomId = (payload as { roomId: string }).roomId;
        this.server.to(`room:${roomId}`).emit(event, payload);
      },
      toParticipant: (participantId, event, payload) => {
        this.server.to(`participant:${participantId}`).emit(event, payload);
      },
    });
  }

  private data(client: Socket): SocketData {
    return client.data as SocketData;
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = (client.handshake.auth as { token?: string }).token;
      if (!token) throw new Error('Sin token');
      const payload = this.guestTokens.verify(token);
      if (!payload) throw new Error('Token inválido');
      const participant = await this.prisma.roomParticipant.findUnique({
        where: { id: payload.participantId },
      });
      if (!participant || participant.roomId !== payload.roomId || participant.kickedAt) {
        throw new Error('Participante no válido');
      }

      const data: SocketData = {
        participantId: participant.id,
        roomId: participant.roomId,
        role: participant.role,
      };
      client.data = data;
      await client.join([`room:${participant.roomId}`, `participant:${participant.id}`]);

      let set = this.presence.get(participant.roomId);
      if (!set) {
        set = new Set();
        this.presence.set(participant.roomId, set);
      }
      set.add(participant.id);

      await this.engine.ensureRuntime(participant.roomId);
      const state = await this.roomState.build(participant.roomId, participant.id, set);
      client.emit('room:state', this.wrap(participant.roomId, state));
      client.to(`room:${participant.roomId}`).emit(
        'room:participant-joined',
        this.wrap(participant.roomId, {
          id: participant.id,
          alias: participant.alias,
          role: participant.role,
        }),
      );
    } catch (err) {
      this.logger.warn(`Conexión rechazada: ${(err as Error).message}`);
      client.emit('room:error', {
        payload: { code: 'AUTH', message: 'Autenticación de sala fallida' },
      });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const data = this.data(client);
    if (!data?.roomId) return;
    const set = this.presence.get(data.roomId);
    set?.delete(data.participantId);
    client
      .to(`room:${data.roomId}`)
      .emit('room:participant-left', this.wrap(data.roomId, { id: data.participantId }));
  }

  private wrap(roomId: string, payload: unknown) {
    return {
      eventId: randomUUID(),
      roomId,
      gameId: '',
      sequenceNumber: 0,
      serverTimestamp: Date.now(),
      contractVersion: 1,
      payload,
    };
  }

  private async broadcastState(roomId: string): Promise<void> {
    const set = this.presence.get(roomId) ?? new Set<string>();
    const sockets = await this.server.in(`room:${roomId}`).fetchSockets();
    for (const socket of sockets) {
      const data = socket.data as SocketData;
      const state = await this.roomState.build(roomId, data.participantId, set);
      socket.emit('room:state', this.wrap(roomId, state));
    }
  }

  // ---------- Audio ----------

  /** Última reacción de cada jugador, para el enfriamiento. */
  private readonly lastReactionAt = new Map<string, number>();

  @SubscribeMessage('audio:enabled')
  async audioEnabled(@ConnectedSocket() client: Socket): Promise<void> {
    const { participantId, roomId } = this.data(client);
    await this.prisma.audioReadiness.upsert({
      where: { participantId },
      update: { status: 'READY', errorMessage: null },
      create: { participantId, status: 'READY' },
    });
    this.server
      .to(`room:${roomId}`)
      .emit(
        'room:participant-updated',
        this.wrap(roomId, { id: participantId, audioStatus: 'READY' }),
      );
  }

  @SubscribeMessage('audio:error')
  async audioError(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { message?: string },
  ): Promise<void> {
    const { participantId, roomId } = this.data(client);
    await this.prisma.audioReadiness.upsert({
      where: { participantId },
      update: { status: 'ERROR', errorMessage: body?.message?.slice(0, 200) },
      create: { participantId, status: 'ERROR', errorMessage: body?.message?.slice(0, 200) },
    });
    this.server
      .to(`room:${roomId}`)
      .emit(
        'room:participant-updated',
        this.wrap(roomId, { id: participantId, audioStatus: 'ERROR' }),
      );
  }

  @SubscribeMessage('audio:preload-status')
  preloadStatus(@ConnectedSocket() client: Socket, @MessageBody() body: { ready?: boolean }): void {
    const { participantId, roomId } = this.data(client);
    this.engine.reportPreload(roomId, participantId, Boolean(body?.ready));
  }

  // ---------- Juego ----------

  @SubscribeMessage('card:mark')
  async markCell(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: MarkCellRequest,
  ): Promise<MarkCellAck> {
    const { participantId, roomId, role } = this.data(client);
    if (role !== 'PLAYER') return { ok: false, message: 'Solo los jugadores marcan' };
    if (!body?.cellId) return { ok: false, message: 'cellId requerido' };
    return this.engine.markCell(roomId, participantId, body.cellId);
  }

  /**
   * Respuesta a una pregunta con opciones.
   *
   * El ack solo confirma que se ha registrado: decir aquí si es correcta sería
   * decir la solución antes del reveal.
   */
  @SubscribeMessage('player:answer')
  async submitAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: SubmitAnswerRequest,
  ): Promise<SubmitAnswerAck> {
    const { participantId, roomId, role } = this.data(client);
    if (role !== 'PLAYER') return { ok: false, message: 'Solo los jugadores responden' };
    if (typeof body?.optionIndex !== 'number')
      return { ok: false, message: 'optionIndex requerido' };
    return this.engine.submitAnswer(roomId, participantId, body.optionIndex);
  }

  /** Última respuesta escrita de cada jugador, para el enfriamiento. */
  private readonly lastTextAnswerAt = new Map<string, number>();

  /**
   * Respuesta escrita.
   *
   * Con varios intentos permitidos, escribir es barato y se puede probar a
   * fuerza bruta: por eso hay un enfriamiento por jugador además del límite
   * de intentos. El ack tampoco dice si es correcta.
   */
  @SubscribeMessage('player:text-answer')
  async submitTextAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: SubmitTextAnswerRequest,
  ): Promise<SubmitTextAnswerAck> {
    const { participantId, roomId, role } = this.data(client);
    if (role !== 'PLAYER') return { ok: false, message: 'Solo los jugadores responden' };
    if (typeof body?.text !== 'string') return { ok: false, message: 'text requerido' };

    const now = Date.now();
    const last = this.lastTextAnswerAt.get(participantId) ?? 0;
    if (now - last < TEXT_ANSWER_COOLDOWN_MS) {
      return { ok: false, message: 'Espera un momento antes de volver a probar' };
    }
    this.lastTextAnswerAt.set(participantId, now);

    return this.engine.submitTextAnswer(roomId, participantId, body.text);
  }

  /**
   * Reacciones. Se limitan por jugador para que nadie inunde la proyección:
   * es una forma de animar, no un canal de mensajes.
   */
  @SubscribeMessage('player:react')
  react(@ConnectedSocket() client: Socket, @MessageBody() body: { reaction?: string }): void {
    const { participantId, roomId, role } = this.data(client);
    if (role !== 'PLAYER') return;
    const reaction = REACTIONS.find((r) => r === body?.reaction);
    if (!reaction) return;

    const now = Date.now();
    const recent = this.lastReactionAt.get(participantId) ?? 0;
    if (now - recent < REACTION_COOLDOWN_MS) return;
    this.lastReactionAt.set(participantId, now);

    this.engine.broadcastReaction(roomId, participantId, reaction);
  }

  @SubscribeMessage('claim:line')
  async claimLine(@ConnectedSocket() client: Socket) {
    const { participantId, roomId, role } = this.data(client);
    if (role !== 'PLAYER') return { accepted: false };
    return this.engine.claim(roomId, participantId, 'LINE');
  }

  @SubscribeMessage('claim:bingo')
  async claimBingo(@ConnectedSocket() client: Socket) {
    const { participantId, roomId, role } = this.data(client);
    if (role !== 'PLAYER') return { accepted: false };
    return this.engine.claim(roomId, participantId, 'BINGO');
  }

  // ---------- Controles del anfitrión ----------

  private assertHost(client: Socket): SocketData {
    const data = this.data(client);
    if (data.role !== 'HOST') throw new Error('Solo el anfitrión');
    return data;
  }

  @SubscribeMessage('host:start')
  async hostStart(@ConnectedSocket() client: Socket): Promise<{ ok: boolean }> {
    const { roomId } = this.assertHost(client);
    await this.engine.start(roomId);
    await this.broadcastState(roomId);
    return { ok: true };
  }

  @SubscribeMessage('host:pause')
  hostPause(@ConnectedSocket() client: Socket): { ok: boolean } {
    const { roomId } = this.assertHost(client);
    this.engine.pause(roomId);
    return { ok: true };
  }

  @SubscribeMessage('host:resume')
  async hostResume(@ConnectedSocket() client: Socket): Promise<{ ok: boolean }> {
    const { roomId } = this.assertHost(client);
    await this.engine.resume(roomId);
    return { ok: true };
  }

  @SubscribeMessage('host:skip')
  async hostSkip(@ConnectedSocket() client: Socket): Promise<{ ok: boolean }> {
    const { roomId } = this.assertHost(client);
    await this.engine.skip(roomId);
    return { ok: true };
  }

  @SubscribeMessage('host:replay')
  async hostReplay(@ConnectedSocket() client: Socket): Promise<{ ok: boolean }> {
    const { roomId } = this.assertHost(client);
    await this.engine.replay(roomId);
    return { ok: true };
  }

  @SubscribeMessage('host:reveal')
  async hostReveal(@ConnectedSocket() client: Socket): Promise<{ ok: boolean }> {
    const { roomId } = this.assertHost(client);
    await this.engine.reveal(roomId);
    return { ok: true };
  }

  @SubscribeMessage('host:next')
  async hostNext(@ConnectedSocket() client: Socket): Promise<{ ok: boolean }> {
    const { roomId } = this.assertHost(client);
    await this.engine.next(roomId);
    return { ok: true };
  }

  @SubscribeMessage('host:add-time')
  hostAddTime(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { extraMs?: number },
  ): { ok: boolean } {
    const { roomId } = this.assertHost(client);
    const extra = Math.min(Math.max(body?.extraMs ?? 10000, 1000), 60000);
    this.engine.addTime(roomId, extra);
    return { ok: true };
  }

  @SubscribeMessage('host:end')
  async hostEnd(@ConnectedSocket() client: Socket): Promise<{ ok: boolean }> {
    const { roomId } = this.assertHost(client);
    await this.engine.finish(roomId);
    return { ok: true };
  }

  @SubscribeMessage('host:kick')
  async hostKick(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { participantId?: string },
  ): Promise<{ ok: boolean }> {
    const { roomId } = this.assertHost(client);
    if (!body?.participantId) return { ok: false };
    await this.prisma.roomParticipant.updateMany({
      where: { id: body.participantId, roomId, role: 'PLAYER' },
      data: { kickedAt: new Date() },
    });
    const sockets = await this.server.in(`participant:${body.participantId}`).fetchSockets();
    for (const s of sockets) s.disconnect(true);
    await this.broadcastState(roomId);
    return { ok: true };
  }

  @SubscribeMessage('host:lock')
  async hostLock(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { locked?: boolean },
  ): Promise<{ ok: boolean }> {
    const { roomId } = this.assertHost(client);
    await this.prisma.room.update({
      where: { id: roomId },
      data: { lockedAt: body?.locked === false ? null : new Date() },
    });
    await this.broadcastState(roomId);
    return { ok: true };
  }
}
