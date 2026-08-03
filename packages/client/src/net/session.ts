export interface SavedSession {
  roomCode: string;
  sessionToken: string;
  playerId: string;
  name: string;
}

const KEY = 'triominos:session';

export function saveSession(session: SavedSession): void {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function loadSession(): SavedSession | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SavedSession;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
}
