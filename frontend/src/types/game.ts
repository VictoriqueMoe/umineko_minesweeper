export type MessageType =
    | "create_game"
    | "join_game"
    | "reconnect"
    | "reveal"
    | "flag"
    | "game_created"
    | "player_joined"
    | "game_start"
    | "cells_revealed"
    | "cell_flagged"
    | "game_over"
    | "opponent_disconnected"
    | "opponent_reconnected"
    | "reconnected"
    | "error";

export interface OutgoingMessage {
    type: "create_game" | "join_game" | "reconnect" | "reveal" | "flag";
    code?: string;
    token?: string;
    x?: number;
    y?: number;
}

export interface IncomingMessage {
    type: MessageType;
    code?: string;
    token?: string;
    playerNumber?: number;
    width?: number;
    height?: number;
    mines?: number;
    player?: number;
    cells?: CellData[];
    x?: number;
    y?: number;
    flagged?: boolean;
    winner?: number;
    loser?: number;
    reason?: string;
    message?: string;
    countdown?: number;
    mineCells?: CellData[];
}

export interface CellData {
    x: number;
    y: number;
    value: number;
}

export enum CellState {
    Hidden,
    Revealed,
    Flagged,
    Exploding,
}

export interface ClientCell {
    state: CellState;
    value: number;
    animDelay: number;
}

export enum GamePhase {
    Lobby,
    Waiting,
    Playing,
    Exploding,
    Finished,
}

export interface BoardState {
    width: number;
    height: number;
    mines: number;
    cells: ClientCell[][];
}

export interface GameState {
    phase: GamePhase;
    playerNumber: number;
    roomCode: string;
    myBoard: BoardState | null;
    opponentBoard: BoardState | null;
    winner: number;
    reason: string;
    error: string;
    opponentDisconnected: boolean;
    disconnectCountdown: number;
    pendingMineCells: CellData[];
    triggeredMine: CellData | null;
}
