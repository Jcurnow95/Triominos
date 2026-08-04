/**
 * Sound effects and background music, all served from public/sounds. Files there are
 * copied verbatim to the site root by Vite, so they're referenced by plain path -- no
 * bundler import needed, and dropping in a new file is all it takes to use it.
 *
 * SFX and music are independently mutable and independently volume-controlled, wired up
 * to their own settings-panel toggle + slider.
 */

const TILE_PLACED_FILES = ['tilePlaced.mp3', 'tilePlaced2.mp3'];
const GAME_MUSIC_FILES = ['gameMusic.mp3', 'gameMusic2.mp3', 'gameMusic3.mp3', 'gameMusic4.mp3'];
/** Each track in the playlist repeats this many times before the playlist advances. */
const REPEATS_PER_TRACK = 6;

function soundUrl(file: string): string {
  return `/sounds/${file}`;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** UI sliders are 0-100; playback volume is 0-1. */
function fromPercent(percent: number): number {
  return clamp01(percent / 100);
}

// ---------- Sound effects ----------

let sfxEnabled = true;
let sfxVolume = 0.8;

export function setSfxEnabled(value: boolean): void {
  sfxEnabled = value;
}

export function setSfxVolume(percent: number): void {
  sfxVolume = fromPercent(percent);
}

function playOneShot(file: string, relativeVolume = 1): void {
  if (!sfxEnabled) return;
  const audio = new Audio(soundUrl(file));
  audio.volume = clamp01(sfxVolume * relativeVolume);
  // Autoplay can be blocked by the browser before any user gesture; that's fine, a
  // rejected play() just means silence rather than an unhandled promise rejection.
  void audio.play().catch(() => {});
}

export function playTileShuffle(): void {
  playOneShot('tileShuffle.mp3');
}

export function playTilePlaced(): void {
  playOneShot(pickRandom(TILE_PLACED_FILES), 0.85);
}

export function playBridge(): void {
  playOneShot('Bridge.mp3');
}

export function playHexagon(): void {
  playOneShot('Hexagon.mp3');
}

export function playPass(): void {
  playOneShot('pass.mp3', 0.8);
}

export function playGameWon(): void {
  playOneShot('gameWon.mp3');
}

export function playGameOver(): void {
  playOneShot('gameOver.mp3');
}

// ---------- Background music ----------
// A shuffled playlist that loops for as long as a game is active; each track repeats
// REPEATS_PER_TRACK times before the playlist moves on to the next one.

let musicEnabled = true;
let musicVolume = 0.4;
let musicAudio: HTMLAudioElement | null = null;
let musicPlaylist: string[] = [];
let musicIndex = 0;
let musicRepeatsLeft = 0;

export function setMusicEnabled(value: boolean): void {
  musicEnabled = value;
  if (!musicEnabled) stopGameMusic();
}

/** Applies live, so dragging the slider mid-track has an immediate effect. */
export function setMusicVolume(percent: number): void {
  musicVolume = fromPercent(percent);
  if (musicAudio) musicAudio.volume = musicVolume;
}

function playCurrentTrack(): void {
  if (!musicAudio) return;
  if (musicIndex >= musicPlaylist.length) {
    musicPlaylist = shuffled(GAME_MUSIC_FILES);
    musicIndex = 0;
  }
  musicAudio.src = soundUrl(musicPlaylist[musicIndex]);
  musicRepeatsLeft = REPEATS_PER_TRACK;
  void musicAudio.play().catch(() => {});
}

function handleTrackEnded(): void {
  if (!musicAudio) return;
  musicRepeatsLeft -= 1;
  if (musicRepeatsLeft > 0) {
    musicAudio.currentTime = 0;
    void musicAudio.play().catch(() => {});
  } else {
    musicIndex += 1;
    playCurrentTrack();
  }
}

export function startGameMusic(): void {
  if (!musicEnabled || musicAudio) return;
  musicAudio = new Audio();
  musicAudio.volume = musicVolume;
  musicAudio.addEventListener('ended', handleTrackEnded);
  musicPlaylist = shuffled(GAME_MUSIC_FILES);
  musicIndex = 0;
  playCurrentTrack();
}

export function stopGameMusic(): void {
  if (!musicAudio) return;
  musicAudio.pause();
  musicAudio.removeEventListener('ended', handleTrackEnded);
  musicAudio = null;
}
