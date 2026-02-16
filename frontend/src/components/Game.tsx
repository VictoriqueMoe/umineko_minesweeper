import {BoardState, CellState, GamePhase} from "../types/game";
import {Board} from "./Board";
import {MiniBoard} from "./MiniBoard";
import {CHARACTERS} from "../characters";

interface GameProps {
    phase: GamePhase;
    myBoard: BoardState;
    opponentBoard: BoardState;
    myCharacter: string;
    opponentCharacter: string;
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

function findCharacter(id: string) {
    return CHARACTERS.find(c => c.id === id);
}

export function Game({ phase, myBoard, opponentBoard, myCharacter, opponentCharacter, onReveal, onFlag }: GameProps) {
    const totalSafe = myBoard.width * myBoard.height - myBoard.mines;
    const myRevealed = countRevealed(myBoard);
    const opRevealed = countRevealed(opponentBoard);
    const myFlagged = countFlagged(myBoard);

    const myChar = findCharacter(myCharacter);
    const opChar = findCharacter(opponentCharacter);

    return (
        <>
            <div className="game-info">
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
                    {myChar && <img className="board-character-bg" src={myChar.image} alt="" />}
                    <div className="board-header">
                        <div className="board-label">{myChar?.name ?? "Your Board"}</div>
                    </div>
                    <Board board={myBoard} phase={phase} onReveal={onReveal} onFlag={onFlag} />
                </div>

                <div className="divider" />

                <div className={`board-section${opponentCharacter ? ` theme-${opponentCharacter}` : ""}`}>
                    {opChar && <img className="board-character-bg" src={opChar.image} alt="" />}
                    <div className="board-header">
                        <div className="board-label opponent">{opChar?.name ?? "Opponent"}</div>
                    </div>
                    <MiniBoard board={opponentBoard} />
                </div>
            </div>
        </>
    );
}
