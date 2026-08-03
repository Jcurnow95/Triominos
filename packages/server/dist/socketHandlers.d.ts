import type { Server, Socket } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '@triominos/shared';
type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
export declare function registerSocketHandlers(io: IOServer, socket: IOSocket): void;
export {};
