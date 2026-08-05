import { describe, expect, it } from 'vitest';
import { GuestTokenService } from './guest-token.service';

const service = new GuestTokenService();
const payload = {
  participantId: '11111111-1111-1111-1111-111111111111',
  roomId: '22222222-2222-2222-2222-222222222222',
  exp: Date.now() + 60_000,
};

describe('GuestTokenService', () => {
  it('firma y verifica un token propio', () => {
    expect(service.verify(service.sign(payload))).toEqual(payload);
  });

  it('rechaza un token con la firma cambiada', () => {
    const [body] = service.sign(payload).split('.');
    expect(service.verify(`${body}.firmaFalsa`)).toBeNull();
  });

  it('rechaza un token cuyo payload se ha manipulado', () => {
    const token = service.sign(payload);
    const [, signature] = token.split('.');
    const alterado = Buffer.from(JSON.stringify({ ...payload, roomId: 'otra-sala' })).toString(
      'base64url',
    );
    expect(service.verify(`${alterado}.${signature}`)).toBeNull();
  });

  it('rechaza un token caducado', () => {
    expect(service.verify(service.sign({ ...payload, exp: Date.now() - 1000 }))).toBeNull();
  });

  it('rechaza tokens mal formados', () => {
    expect(service.verify('')).toBeNull();
    expect(service.verify('sin-punto')).toBeNull();
    expect(service.verify('no-base64.tampoco')).toBeNull();
  });

  it('no confunde tokens de participantes distintos', () => {
    const otro = { ...payload, participantId: '33333333-3333-3333-3333-333333333333' };
    expect(service.verify(service.sign(otro))?.participantId).toBe(otro.participantId);
    expect(service.verify(service.sign(payload))?.participantId).toBe(payload.participantId);
  });
});
