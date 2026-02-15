import {BoardState, CellState, GamePhase} from "../types/game";
import {Board} from "./Board";
import {MiniBoard} from "./MiniBoard";

interface GameProps {
    phase: GamePhase;
    playerNumber: number;
    myBoard: BoardState;
    opponentBoard: BoardState;
    onReveal: (x: number, y: number) => void;
    onFlag: (x: number, y: number) => void;
}

function countRevealed(board: BoardState): number {
    let count = 0;
    for (let y = 0; y < board.height; y++) {
        for (let x = 0; x < board.width; x++) {
            if (board.cells[y][x].state === CellState.Revealed) {
                count++;
            }
        }
    }
    return count;
}

function countFlagged(board: BoardState): number {
    let count = 0;
    for (let y = 0; y < board.height; y++) {
        for (let x = 0; x < board.width; x++) {
            if (board.cells[y][x].state === CellState.Flagged) {
                count++;
            }
        }
    }
    return count;
}

export function Game({ phase, playerNumber, myBoard, opponentBoard, onReveal, onFlag }: GameProps) {
    const totalSafe = myBoard.width * myBoard.height - myBoard.mines;
    const myRevealed = countRevealed(myBoard);
    const opRevealed = countRevealed(opponentBoard);
    const myFlagged = countFlagged(myBoard);

    return (
        <>
            <div className="game-info">
                <div className="stat">
                    Player <span className="stat-value">{playerNumber + 1}</span>
                </div>
                <div className="stat">
                    Progress{" "}
                    <span className="stat-value">
                        {myRevealed}/{totalSafe}
                    </span>
                </div>
                <div className="stat">
                    Flags{" "}
                    <span className="stat-value">
                        {myFlagged}/{myBoard.mines}
                    </span>
                </div>
                <div className="stat">
                    Opponent{" "}
                    <span className="stat-value">
                        {opRevealed}/{totalSafe}
                    </span>
                </div>
            </div>

            <div className="game-layout">
                <div className="board-section">
                    <div className="board-label">Your Board</div>
                    <Board board={myBoard} phase={phase} onReveal={onReveal} onFlag={onFlag} />
                </div>

                <div className="divider" />

                <div className="board-section">
                    <div className="board-label opponent">Opponent</div>
                    <MiniBoard board={opponentBoard} />
                </div>
            </div>
        </>
    );
}
