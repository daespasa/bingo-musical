export type CollectionSummary = {
  id: string;
  name: string;
  description: string | null;
  isDemo: boolean;
  trackCount: number;
};

export type CollectionTrack = {
  id: string;
  position: number;
  title: string;
  artist: string;
  durationMs: number | null;
  previewUrl: string | null;
  previewStatus: string | null;
};

export type CollectionDetail = CollectionSummary & { tracks: CollectionTrack[] };

export type GameSettings = {
  cardSize: number;
  freeCenter: boolean;
  snippetDurationMs: number;
  answerWindowMs: number;
  autoReveal: boolean;
  autoAdvance: boolean;
  roundResultsMs: number;
  lineEnabled: boolean;
  bingoEnabled: boolean;
  showLeaderboard: boolean;
  shuffleTracks: boolean;
};

export type GameDetail = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  collection: { id: string; name: string; trackCount: number };
  settings: GameSettings | null;
  rooms: Array<{ id: string; code: string; status: string; mode: string; createdAt: string }>;
};

export type RoomPublic = {
  id: string;
  code: string;
  mode: string;
  status: string;
  gameName: string;
  cardSize: number;
  participantCount: number;
  locked: boolean;
};

export type GuestSession = {
  participantId: string;
  roomId: string;
  alias: string;
  token: string;
  code: string;
};

const GUEST_KEY = 'bingo:guest';

export function saveGuestSession(session: GuestSession): void {
  localStorage.setItem(GUEST_KEY, JSON.stringify(session));
}

export function loadGuestSession(code: string): GuestSession | null {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestSession;
    return parsed.code === code.toUpperCase() ? parsed : null;
  } catch {
    return null;
  }
}
