import { useState } from 'react';
import type { GameRules, LobbyState } from '@triominos/shared';
import { GameRulesEditor } from '../components/GameRulesEditor';

interface LobbyProps {
  lobby: LobbyState;
  selfPlayerId: string;
  busy: boolean;
  error: string | null;
  onStart: () => void;
  onUpdateRules: (rules: GameRules) => void;
  onLeave: () => void;
}

export function Lobby({ lobby, selfPlayerId, busy, error, onStart, onUpdateRules, onLeave }: LobbyProps) {
  const isHost = lobby.hostId === selfPlayerId;
  const shareUrl = `${window.location.origin}${window.location.pathname}?room=${lobby.roomCode}`;
  const [showRules, setShowRules] = useState(false);

  return (
    <div className="lobby-page">
      <button className="link-button" onClick={onLeave}>&larr; Back</button>

      <h1>Room {lobby.roomCode}</h1>
      <p className="tagline">Share this code or link with friends to have them join.</p>

      <div className="room-code-display">{lobby.roomCode}</div>

      <button
        className="secondary"
        onClick={() => navigator.clipboard?.writeText(shareUrl)}
      >
        Copy invite link
      </button>

      <ul className="player-list">
        {lobby.players.map((p) => (
          <li key={p.id} className={p.connected ? '' : 'disconnected'}>
            <span className={`status-dot ${p.connected ? 'online' : 'offline'}`} />
            {p.name}
            {p.id === lobby.hostId && <span className="badge">Host</span>}
            {p.id === selfPlayerId && <span className="badge you">You</span>}
          </li>
        ))}
      </ul>

      {isHost ? (
        <>
          <button type="button" className="link-button" onClick={() => setShowRules((v) => !v)}>
            {showRules ? '−' : '+'} Game settings
          </button>
          {showRules && <GameRulesEditor rules={lobby.rules} onChange={onUpdateRules} />}
        </>
      ) : (
        <p className="rules-summary">
          {`Playing to ${lobby.rules.winningScore} · ${lobby.rules.tileSets}× tile set${lobby.rules.tileSets > 1 ? 's' : ''} · draw up to ${lobby.rules.maxDrawsPerTurn} a turn`}
        </p>
      )}

      {isHost ? (
        <button className="primary" disabled={busy || lobby.players.length < 2} onClick={onStart}>
          {lobby.players.length < 2 ? 'Waiting for more players...' : 'Start Game'}
        </button>
      ) : (
        <p className="waiting-text">Waiting for the host to start the game...</p>
      )}

      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
