export type MessageType =
    | "create_game"
    | "join_game"
    | "select_character"
    | "reconnect"
    | "reveal"
    | "flag"
    | "game_created"
    | "join_pending"
    | "player_joined"
    | "game_start"
    | "cells_revealed"
    | "cell_flagged"
    | "game_over"
    | "opponent_disconnected"
    | "opponent_reconnected"
    | "reconnected"
    | "first_click_pending"
    | "error";

export interface OutgoingMessage {
    type: "create_game" | "join_game" | "select_character" | "reconnect" | "reveal" | "flag";
    code?: string;
    token?: string;
    difficulty?: string;
    character?: string;
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
    characters?: string[];
    hostCharacter?: string;
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
    CharacterSelect,
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
    myCharacter: string;
    opponentCharacter: string;
    myBoard: BoardState | null;
    opponentBoard: BoardState | null;
    winner: number;
    reason: string;
    error: string;
    opponentDisconnected: boolean;
    disconnectCountdown: number;
    hostCharacter: string;
    pendingMineCells: CellData[];
    triggeredMine: CellData | null;
    pendingClick: { x: number; y: number } | null;
}
