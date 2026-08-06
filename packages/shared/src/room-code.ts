/**
 * Código de sala: seis caracteres de un alfabeto sin ambigüedades. No hay
 * ceros ni oes, ni unos ni íes ni eles, porque el código se lee en voz alta o
 * desde una pantalla al otro lado de la habitación.
 *
 * Vive aquí para que el servidor que los genera y el formulario que los recoge
 * no puedan discrepar.
 */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 6;

/**
 * Deja solo caracteres válidos, en mayúsculas, hasta la longitud del código.
 * Sirve para teclear, pegar y para lo que devuelve el escáner de QR.
 */
export function normalizeRoomCode(input: string): string {
  let out = '';
  for (const char of input.toUpperCase()) {
    if (ROOM_CODE_ALPHABET.includes(char)) {
      out += char;
      if (out.length === ROOM_CODE_LENGTH) break;
    }
  }
  return out;
}

export function isCompleteRoomCode(input: string): boolean {
  return normalizeRoomCode(input).length === ROOM_CODE_LENGTH;
}

/**
 * Saca el código de lo que haya escaneado la cámara: tanto un enlace
 * `https://…/join/ABC234` como el código a secas.
 *
 * Con un enlace solo se mira el último tramo de la ruta, porque el dominio
 * puede contener por casualidad seis caracteres válidos seguidos.
 */
export function extractRoomCode(text: string): string | null {
  const trimmed = text.trim();

  const fromPath = /\/join\/([^/?#\s]+)/i.exec(trimmed);
  if (fromPath?.[1]) {
    const code = normalizeRoomCode(fromPath[1]);
    return code.length === ROOM_CODE_LENGTH ? code : null;
  }

  // Un enlace que no sea de entrada a sala no contiene un código utilizable
  if (/^[a-z]+:\/\//i.test(trimmed)) return null;

  const code = normalizeRoomCode(trimmed);
  return code.length === ROOM_CODE_LENGTH ? code : null;
}
