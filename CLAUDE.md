# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A multiplayer Tri-Ominos game (triangular dominoes): npm-workspaces monorepo with three packages — `@triominos/shared` (game logic), `@triominos/server` (Express + Socket.IO), `@triominos/client` (React + Vite). Requires Node >= 20.

## Commands

All run from the repo root:

```sh
npm install                 # install all workspaces
npm run build               # build shared -> server -> client (order matters)
npm run dev:server          # tsx watch, serves Socket.IO on :3001
npm run dev:client          # vite on :5173, proxies /socket.io to :3001
npm test                    # vitest over packages/shared (the only tested package)
npm test -- scoring         # run a single test file (filters by name, e.g. test/scoring.test.ts)
npm run start               # run built server (serves built client statically)
npm run package:exe         # standalone Windows exe -> release/Triominos.exe (run npm run build first)
```

Dev mode needs both `dev:server` and `dev:client` running. There is no linter; the client's `build` script type-checks with `tsc --noEmit`.

## Critical build gotchas

- **Server and client consume `@triominos/shared` via its built `dist/`** (`main: dist/index.js`), including under `tsx watch` and vite dev. After editing `packages/shared/src`, run `npm run build --workspace=packages/shared` or consumers keep using stale code.
- **`dist/` output is committed to git** for all three packages. When you change `src`, rebuild and commit the corresponding `dist/` alongside it (see e.g. commit "Rebuild the client bundle...").
- `.gitignore` is a Visual Studio template; it accidentally matched the `packages/` dir and un-ignores it explicitly (`!/packages/`). `release/` and `packages/server/dist-exe/` are ignored.

## Architecture

**`packages/shared` is the authoritative game engine** — pure TypeScript, no runtime deps, fully unit-tested (`packages/shared/test/`). Both server and client import it, so game rules exist in exactly one place:

- `grid.ts` — triangular lattice geometry: each rhombus splits into "up"/"down" triangle cells; every interior vertex touches exactly 6 cells, which makes hexagon-bonus detection exact. Read its header comment before touching board geometry.
- `tiles.ts`, `board.ts`, `scoring.ts` — deck, placement/adjacency validity, scoring (incl. bridge/hexagon bonuses).
- `rules.ts` — configurable `GameRules` (target score, tile sets, freestyle tiles, draw cap) with `sanitizeGameRules` clamping host input.
- `gameState.ts` — full round/match state machine; produces `PublicGameState` (per-player redacted view) sent over the wire.
- `bot.ts` — computer opponents by `BotDifficulty`; driven server-side.
- `protocol.ts` — **typed Socket.IO contract**: `ClientToServerEvents` / `ServerToClientEvents` interfaces used by both server (`socket.io`) and client (`socket.io-client`). All client→server events use ack callbacks returning `{ ok: true, ... } | { ok: false, error }`. Add new events here first.

**`packages/server`** — thin real-time layer, all state in memory (no DB):

- `rooms.ts` — room registry: players, session tokens (for `rejoinRoom` after disconnect/refresh), host-editable rules, `botRunning` guard so only one bot-turn driver runs per room; empty rooms are swept periodically.
- `socketHandlers.ts` — registers every protocol event; validates via shared logic, then broadcasts `lobbyUpdate`/`gameUpdate`.
- `index.ts` — serves the built client statically; contains dual path resolution for dev vs. the SEA-packaged exe (client shipped as a `client/` folder next to the .exe).

**`packages/client`** — React 18, no router library; pages in `src/pages/` (Home, Lobby, Game, Puzzle):

- `net/socket.ts` — singleton typed socket (connects to same origin; vite proxy in dev); `net/session.ts` persists room/session tokens for rejoin.
- `puzzles.ts` — Puzzle Mode level definitions (client-side solo mode).
- `geometry.ts` + `components/Board.tsx` — maps shared triangular-grid coords to screen space.

**Deployment**: Railway via `railway.json` (`npm run build` / `npm run start` — single service serving both API and client). Alternatively `npm run package:exe` builds a Node SEA single-file Windows executable (`packages/server/scripts/build-exe.mjs`).
