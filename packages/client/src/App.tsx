import { useEffect, useRef, useState } from 'react';
import type { BotDifficulty, CellCoord, GameRules, LobbyState, PublicGameState } from '@triominos/shared';
import { getSocket } from './net/socket';
import { clearSession, loadSession, saveSession } from './net/session';
import { ThemePrefs, applyTheme, loadThemePrefs, saveThemePrefs } from './theme';
import { GamePrefs, loadGamePrefs, saveGamePrefs } from './preferences';
import {
  playGameOver,
  playGameWon,
  playTileShuffle,
  setMusicEnabled,
  setMusicVolume,
  setSfxEnabled,
  setSfxVolume,
  startGameMusic,
  stopGameMusic,
} from './sound';
import { Home } from './pages/Home';
import { Lobby } from './pages/Lobby';
import { Game } from './pages/Game';
import { Puzzle } from './pages/Puzzle';

type Phase = 'connecting' | 'home' | 'lobby' | 'game' | 'puzzle';

function roomCodeFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return (params.get('room') ?? '').toUpperCase();
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('connecting');
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [game, setGame] = useState<PublicGameState | null>(null);
  const [selfPlayerId, setSelfPlayerId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [themePrefs, setThemePrefs] = useState<ThemePrefs>(() => loadThemePrefs());

  const [gamePrefs, setGamePrefs] = useState<GamePrefs>(() => loadGamePrefs());

  useEffect(() => {
    applyTheme(themePrefs);
    saveThemePrefs(themePrefs);
  }, [themePrefs]);

  useEffect(() => {
    saveGamePrefs(gamePrefs);
  }, [gamePrefs]);

  useEffect(() => {
    setSfxEnabled(gamePrefs.sfxEnabled);
  }, [gamePrefs.sfxEnabled]);

  useEffect(() => {
    setSfxVolume(gamePrefs.sfxVolume);
  }, [gamePrefs.sfxVolume]);

  useEffect(() => {
    setMusicEnabled(gamePrefs.musicEnabled);
  }, [gamePrefs.musicEnabled]);

  useEffect(() => {
    setMusicVolume(gamePrefs.musicVolume);
  }, [gamePrefs.musicVolume]);

  // Background music runs for as long as we're on the game screen, in any round phase.
  useEffect(() => {
    if (phase === 'game' && gamePrefs.musicEnabled) startGameMusic();
    else stopGameMusic();
    return () => stopGameMusic();
  }, [phase, gamePrefs.musicEnabled]);

  // Fires once per game-over transition, not on every subsequent re-render.
  const announcedGameOverRef = useRef(false);
  useEffect(() => {
    if (!game || !selfPlayerId) return;
    if (!game.gameOver) {
      announcedGameOverRef.current = false;
      return;
    }
    if (announcedGameOverRef.current) return;
    announcedGameOverRef.current = true;
    if (game.winnerId === selfPlayerId) playGameWon();
    else playGameOver();
  }, [game, selfPlayerId]);

  useEffect(() => {
    const socket = getSocket();

    socket.on('lobbyUpdate', (state) => {
      setLobby(state);
      if (!state.started) setPhase('lobby');
    });
    socket.on('gameStarted', (state) => {
      setGame(state);
      setPhase('game');
      playTileShuffle();
    });
    socket.on('gameUpdate', (state) => {
      setGame(state);
      setPhase('game');
    });
    socket.on('errorMessage', (message) => setError(message));

    const saved = loadSession();
    if (saved) {
      socket.emit('rejoinRoom', { roomCode: saved.roomCode, sessionToken: saved.sessionToken }, (res) => {
        if (res.ok) {
          setSelfPlayerId(saved.playerId);
          setRoomCode(saved.roomCode);
        } else {
          clearSession();
          setPhase('home');
        }
      });
    } else {
      setPhase('home');
    }

    return () => {
      socket.off('lobbyUpdate');
      socket.off('gameStarted');
      socket.off('gameUpdate');
      socket.off('errorMessage');
    };
  }, []);

  function handleCreate(name: string) {
    setBusy(true);
    setError(null);
    getSocket().emit('createRoom', { name }, (res) => {
      setBusy(false);
      if (!res.ok) return setError(res.error);
      saveSession({ roomCode: res.roomCode, sessionToken: res.sessionToken, playerId: res.playerId, name });
      setSelfPlayerId(res.playerId);
      setRoomCode(res.roomCode);
    });
  }

  function handleCreateSolo(name: string, botCount: number, difficulty: BotDifficulty, rules: GameRules) {
    setBusy(true);
    setError(null);
    getSocket().emit('createSoloGame', { name, botCount, difficulty, fastAiMoves: gamePrefs.fastAiMoves, rules }, (res) => {
      setBusy(false);
      if (!res.ok) return setError(res.error);
      saveSession({ roomCode: res.roomCode, sessionToken: res.sessionToken, playerId: res.playerId, name });
      setSelfPlayerId(res.playerId);
      setRoomCode(res.roomCode);
    });
  }

  function handleJoin(name: string, code: string) {
    setBusy(true);
    setError(null);
    getSocket().emit('joinRoom', { roomCode: code, name }, (res) => {
      setBusy(false);
      if (!res.ok) return setError(res.error);
      saveSession({ roomCode: code.toUpperCase(), sessionToken: res.sessionToken, playerId: res.playerId, name });
      setSelfPlayerId(res.playerId);
      setRoomCode(code.toUpperCase());
    });
  }

  function handleStart() {
    if (!roomCode) return;
    setBusy(true);
    setError(null);
    getSocket().emit('startGame', { roomCode }, (res) => {
      setBusy(false);
      if (!res.ok) setError(res.error);
    });
  }

  function handleUpdateRules(rules: GameRules) {
    if (!roomCode) return;
    setError(null);
    getSocket().emit('updateGameRules', { roomCode, rules }, (res) => {
      if (!res.ok) setError(res.error);
    });
  }

  function withRoomAck(action: (roomCode: string, cb: (res: { ok: true } | { ok: false; error: string }) => void) => void) {
    return () => {
      if (!roomCode) return;
      setError(null);
      action(roomCode, (res) => {
        if (!res.ok) setError(res.error);
      });
    };
  }

  function handlePlace(tileId: string, cell: CellCoord) {
    if (!roomCode) return;
    setError(null);
    getSocket().emit('placeTile', { roomCode, tileId, cell }, (res) => {
      if (!res.ok) setError(res.error);
    });
  }

  function handleLeave() {
    clearSession();
    setGame(null);
    setLobby(null);
    setRoomCode(null);
    setSelfPlayerId(null);
    setError(null);
    setPhase('home');
  }

  function handleChooseStarter(tileId: string) {
    if (!roomCode) return;
    setError(null);
    getSocket().emit('chooseStarter', { roomCode, tileId }, (res) => {
      if (!res.ok) setError(res.error);
    });
  }

  if (phase === 'connecting') {
    return <div className="center-message">Connecting...</div>;
  }

  if (phase === 'puzzle') {
    return (
      <Puzzle
        themePrefs={themePrefs}
        gamePrefs={gamePrefs}
        onThemeChange={setThemePrefs}
        onGamePrefsChange={setGamePrefs}
        onExit={() => setPhase('home')}
      />
    );
  }

  if (phase === 'home' || !roomCode || !selfPlayerId) {
    return (
      <Home
        initialRoomCode={roomCodeFromUrl()}
        busy={busy}
        error={error}
        themePrefs={themePrefs}
        gamePrefs={gamePrefs}
        onThemeChange={setThemePrefs}
        onGamePrefsChange={setGamePrefs}
        onCreate={handleCreate}
        onJoin={handleJoin}
        onCreateSolo={handleCreateSolo}
        onPuzzleMode={() => setPhase('puzzle')}
      />
    );
  }

  if (phase === 'lobby' && lobby) {
    return (
      <Lobby
        lobby={lobby}
        selfPlayerId={selfPlayerId}
        busy={busy}
        error={error}
        onStart={handleStart}
        onUpdateRules={handleUpdateRules}
        onLeave={handleLeave}
      />
    );
  }

  if (phase === 'game' && game) {
    return (
      <Game
        game={game}
        selfPlayerId={selfPlayerId}
        error={error}
        themePrefs={themePrefs}
        gamePrefs={gamePrefs}
        onThemeChange={setThemePrefs}
        onGamePrefsChange={setGamePrefs}
        onPlace={handlePlace}
        onDraw={withRoomAck((roomCode, cb) => getSocket().emit('drawFromWell', { roomCode }, cb))}
        onPass={withRoomAck((roomCode, cb) => getSocket().emit('passNoMove', { roomCode }, cb))}
        onChooseStarter={handleChooseStarter}
        onContinueRound={withRoomAck((roomCode, cb) => getSocket().emit('continueNextRound', { roomCode }, cb))}
        onPlayAgain={withRoomAck((roomCode, cb) => getSocket().emit('playAgain', { roomCode }, cb))}
        onResign={withRoomAck((roomCode, cb) => getSocket().emit('resign', { roomCode }, cb))}
        onLeave={handleLeave}
      />
    );
  }

  return <div className="center-message">Loading...</div>;
}
