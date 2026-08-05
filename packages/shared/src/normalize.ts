/** Normaliza títulos, artistas y alias para comparación e igualdad. */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\((feat|ft|con|with)[^)]*\)/g, ' ')
    .replace(/\s*-\s*(remastered|remaster|live|version|edit|radio edit).*$/i, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const ALIAS_REGEX = /^[\p{L}\p{N}\s._-]{2,20}$/u;

/** Sanea y valida un alias de jugador. Devuelve null si no es válido. */
export function sanitizeAlias(raw: string): string | null {
  const alias = raw
    .replace(/<[^>]*>/g, '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!ALIAS_REGEX.test(alias)) return null;
  return alias;
}
