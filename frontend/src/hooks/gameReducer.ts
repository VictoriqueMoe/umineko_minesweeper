import { BoardState, CellData, CellState, ClientCell, GamePhase, GameState } from "../types/game";
import { clearToken } from "./useWebSocket";

export type Action =
    | { type: "game_created"; code: string }
    | { type: "join_pending"; code: string; hostCharacter: string }
    | { type: "player_joined"; playerNumber: number }
    | { type: "game_start"; width: number; height: number; mines: number; characters: string[] }
    | {
          type: "reconnected";
          code: string;
          playerNumber: number;
          width: number;
          height: number;
          mines: number;
          characters: string[];
      }
    | { type: "cells_revealed"; player: number; cells: CellData[] }
    | { type: "cell_flagged"; player: number; x: number; y: number; flagged: boolean }
    | { type: "game_over"; winner: number; loser: number; reason: string; mineCells: CellData[] }
    | { type: "explode_mine"; index: number }
    | { type: "explosion_done" }
    | { type: "opponent_disconnected"; countdown: number }
    | { type: "opponent_reconnected" }
    | { type: "countdown_tick" }
    | { type: "first_click_pending"; x: number; y: number }
    | { type: "error"; message: string }
    | { type: "reset" };

export const initialState: GameState = {
    phase: GamePhase.Lobby,
    playerNumber: -1,
    roomCode: "",
    myCharacter: "",
    opponentCharacter: "",
    myBoard: null,
    opponentBoard: null,
    winner: -1,
    reason: "",
    error: "",
    hostCharacter: "",
    opponentDisconnected: false,
    disconnectCountdown: 0,
    pendingMineCells: [],
    triggeredMine: null,
    pendingClick: null,
};

function createBoard(width: number, height: number, mines: number): BoardState {
    const cells: ClientCell[][] = [];
    for (let y = 0; y < height; y++) {
        cells[y] = [];
        for (let x = 0; x < width; x++) {
            cells[y][x] = { state: CellState.Hidden, value: 0, animDelay: 0 };
        }
    }
    return { width, height, mines, cells };
}

function inBounds(board: BoardState, x: number, y: number): boolean {
    return x >= 0 && x < board.width && y >= 0 && y < board.height;
}

function sortMinesByDistance(mines: CellData[], originX: number, originY: number): CellData[] {
    const sorted = [...mines];
    sorted.sort((a, b) => {
        const distA = Math.abs(a.x - originX) + Math.abs(a.y - originY);
        const distB = Math.abs(b.x - originX) + Math.abs(b.y - originY);
        return distA - distB;
    });
    return sorted;
}

export function reducer(state: GameState, action: Action): GameState {
    switch (action.type) {
        case "game_created": {
            return {
                ...state,
                phase: GamePhase.Waiting,
                roomCode: action.code,
                error: "",
            };
        }
        case "join_pending": {
            return {
                ...state,
                phase: GamePhase.CharacterSelect,
                roomCode: action.code,
                hostCharacter: action.hostCharacter,
                playerNumber: 1,
                error: "",
            };
        }
        case "player_joined": {
            return {
                ...state,
                playerNumber: action.playerNumber,
            };
        }
        case "game_start": {
            const chars = action.characters ?? [];
            const myIdx = state.playerNumber;
            const opIdx = myIdx === 0 ? 1 : 0;
            return {
                ...state,
                phase: GamePhase.Playing,
                myCharacter: chars[myIdx] ?? "",
                opponentCharacter: chars[opIdx] ?? "",
                myBoard: createBoard(action.width, action.height, action.mines),
                opponentBoard: createBoard(action.width, action.height, action.mines),
                error: "",
            };
        }
        case "reconnected": {
            const chars = action.characters ?? [];
            const opIdx = action.playerNumber === 0 ? 1 : 0;
            return {
                ...state,
                phase: GamePhase.Playing,
                playerNumber: action.playerNumber,
                roomCode: action.code,
                myCharacter: chars[action.playerNumber] ?? "",
                opponentCharacter: chars[opIdx] ?? "",
                myBoard: createBoard(action.width, action.height, action.mines),
                opponentBoard: createBoard(action.width, action.height, action.mines),
                error: "",
                opponentDisconnected: false,
                disconnectCountdown: 0,
            };
        }
        case "first_click_pending": {
            return {
                ...state,
                pendingClick: { x: action.x, y: action.y },
            };
        }
        case "cells_revealed": {
            const isMe = action.player === state.playerNumber;
            const board = isMe ? state.myBoard : state.opponentBoard;
            if (!board) {
                return state;
            }

            const newCells = board.cells.map(row => row.map(cell => ({ ...cell })));
            let originX = 0;
            let originY = 0;
            if (action.cells.length > 0) {
                originX = action.cells[0].x;
                originY = action.cells[0].y;
            }

            for (let i = 0; i < action.cells.length; i++) {
                const c = action.cells[i];
                if (!inBounds(board, c.x, c.y)) {
                    continue;
                }
                const dist = Math.abs(c.x - originX) + Math.abs(c.y - originY);
                newCells[c.y][c.x] = {
                    state: CellState.Revealed,
                    value: c.value,
                    animDelay: dist * 25,
                };
            }

            const newBoard = { ...board, cells: newCells };
            if (isMe) {
                return { ...state, myBoard: newBoard, pendingClick: null };
            }
            return { ...state, opponentBoard: newBoard };
        }
        case "cell_flagged": {
            const isMe = action.player === state.playerNumber;
            const board = isMe ? state.myBoard : state.opponentBoard;
            if (!board) {
                return state;
            }

            if (!inBounds(board, action.x, action.y)) {
                return state;
            }

            const newCells = board.cells.map(row => row.map(cell => ({ ...cell })));
            newCells[action.y][action.x] = {
                state: action.flagged ? CellState.Flagged : CellState.Hidden,
                value: newCells[action.y][action.x].value,
                animDelay: 0,
            };

            const newBoard = { ...board, cells: newCells };
            if (isMe) {
                return { ...state, myBoard: newBoard };
            }
            return { ...state, opponentBoard: newBoard };
        }
        case "game_over": {
            if (action.reason === "mine_hit" && action.mineCells.length > 0) {
                const triggered = action.mineCells[0];
                const sorted = sortMinesByDistance(action.mineCells, triggered.x, triggered.y);
                return {
                    ...state,
                    phase: GamePhase.Exploding,
                    winner: action.winner,
                    reason: action.reason,
                    opponentDisconnected: false,
                    disconnectCountdown: 0,
                    pendingMineCells: sorted,
                    triggeredMine: triggered,
                };
            }
            return {
                ...state,
                phase: GamePhase.Finished,
                winner: action.winner,
                reason: action.reason,
                opponentDisconnected: false,
                disconnectCountdown: 0,
            };
        }
        case "explode_mine": {
            const iWon = state.winner === state.playerNumber;
            const board = iWon ? state.opponentBoard : state.myBoard;
            if (!board || action.index >= state.pendingMineCells.length) {
                return state;
            }
            const mine = state.pendingMineCells[action.index];
            if (!inBounds(board, mine.x, mine.y)) {
                return state;
            }
            const newCells = board.cells.map(row => row.map(cell => ({ ...cell })));
            newCells[mine.y][mine.x] = {
                state: CellState.Exploding,
                value: -1,
                animDelay: 0,
            };
            const newBoard = { ...board, cells: newCells };
            if (iWon) {
                return { ...state, opponentBoard: newBoard };
            }
            return { ...state, myBoard: newBoard };
        }
        case "explosion_done": {
            return {
                ...state,
                phase: GamePhase.Finished,
            };
        }
        case "opponent_disconnected": {
            return {
                ...state,
                opponentDisconnected: true,
                disconnectCountdown: action.countdown,
            };
        }
        case "opponent_reconnected": {
            return {
                ...state,
                opponentDisconnected: false,
                disconnectCountdown: 0,
            };
        }
        case "countdown_tick": {
            if (state.disconnectCountdown <= 1) {
                return state;
            }
            return {
                ...state,
                disconnectCountdown: state.disconnectCountdown - 1,
            };
        }
        case "error": {
            return {
                ...state,
                error: action.message,
            };
        }
        case "reset": {
            clearToken();
            return { ...initialState };
        }
        default: {
            return state;
        }
    }
}
