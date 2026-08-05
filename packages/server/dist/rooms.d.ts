import { BotDifficulty, GameRules, GameState } from '@triominos/shared';
export interface RoomPlayer {
    id: string;
    name: string;
    sessionToken: string;
    socketId: string | null;
    isHost: boolean;
    /** Set for computer opponents; humans leave this undefined. */
    botDifficulty?: BotDifficulty;
}
export interface Room {
    code: string;
    players: RoomPlayer[];
    started: boolean;
    game?: GameState;
    createdAt: number;
    emptySince: number | null;
    /** Guards against two concurrent bot-turn drivers running on the same room. */
    botRunning?: boolean;
    /** When true, bots pause only briefly between moves instead of the readable default. */
    fastAiMoves?: boolean;
    /** Score to win, tile set count, draw cap, etc. Editable by the host until the game starts. */
    rules: GameRules;
}
export declare function isBot(player: RoomPlayer): boolean;
export declare function createRoom(hostName: string, hostSocketId: string): {
    room: Room;
    player: RoomPlayer;
};
/** Creates a room already populated with computer opponents, for single-player games. */
export declare function createSoloRoom(hostName: string, hostSocketId: string, botCount: number, difficulty: BotDifficulty, fastAiMoves?: boolean, rules?: Partial<GameRules>): {
    room: Room;
    player: RoomPlayer;
};
export declare function getRoom(code: string): Room | undefined;
export declare function joinRoom(code: string, name: string, socketId: string): {
    room: Room;
    player: RoomPlayer;
} | {
    error: string;
};
export declare function rejoinRoom(code: string, sessionToken: string, socketId: string): {
    room: Room;
    player: RoomPlayer;
} | {
    error: string;
};
export declare function markDisconnected(socketId: string): {
    room: Room;
    player: RoomPlayer;
} | null;
export declare function sweepEmptyRooms(): void;
