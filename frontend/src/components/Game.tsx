import { useEffect } from "react";
import { BoardState, CellState, GamePhase } from "../types/game";
import { Board } from "./Board";
import { MiniBoard } from "./MiniBoard";
import { CharacterDef, CHARACTERS, Expression } from "../characters";
import { useCharacterMood } from "../hooks/useCharacterMood";

interface GameProps {
    phase: GamePhase;
    myBoard: BoardState;
    opponentBoard: BoardState;
    myCharacter: string;
    opponentCharacter: string;
    pendingClick: { x: number; y: number } | null;
    winner: number;
    playerNumber: number;
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

function findCharacter(id: string): CharacterDef | undefined {
    return CHARACTERS.find(c => c.id === id);
}

function preloadCharacterImages(charDef: CharacterDef) {
    for (const expr of Object.values(charDef.expressions) as Expression[]) {
        const img = new Image();
        img.src = expr.image;
    }
}

export function Game({
    phase,
    myBoard,
    opponentBoard,
    myCharacter,
    opponentCharacter,
    pendingClick,
    winner,
    playerNumber,
    onReveal,
    onFlag,
}: GameProps) {
    const totalSafe = myBoard.width * myBoard.height - myBoard.mines;
    const myRevealed = countRevealed(myBoard);
    const opRevealed = countRevealed(opponentBoard);
    const myFlagged = countFlagged(myBoard);

    const myChar = findCharacter(myCharacter);
    const opChar = findCharacter(opponentCharacter);

    const { myExpr, opExpr } = useCharacterMood({
        phase,
        myBoard,
        opponentBoard,
        winner,
        playerNumber,
        myCharacter: myChar,
        opponentCharacter: opChar,
    });

    useEffect(() => {
        if (myChar) {
            preloadCharacterImages(myChar);
        }
        if (opChar) {
            preloadCharacterImages(opChar);
        }
    }, [myChar, opChar]);

    return (
        <div className="game-layout">
            <div className="board-column">
                <div className="fighter-banner">
                    {myChar && (
                        <img
                            className="fighter-img"
                            src={myExpr.image}
                            alt={myChar.name}
                            style={myExpr.facing === "left" ? { transform: "scaleX(-1)" } : undefined}
                        />
                    )}
                    <div className="fighter-nameplate">{myChar?.name ?? "You"}</div>
                </div>
                <div className="board-stats">
                    <div className="stat-row">
                        <span className="stat-label">Progress</span>
                        <span className="stat-value">
                            {myRevealed} / {totalSafe}
                        </span>
                    </div>
                    <div className="stat-row">
                        <span className="stat-label">Flags</span>
                        <span className="stat-value flag">
                            {myFlagged} / {myBoard.mines}
                        </span>
                    </div>
                </div>
                <Board board={myBoard} phase={phase} pendingClick={pendingClick} onReveal={onReveal} onFlag={onFlag} />
                {pendingClick && <div className="pending-text">Waiting for opponent's first move...</div>}
            </div>

            <div className={`board-column${opponentCharacter ? ` theme-${opponentCharacter}` : ""}`}>
                <div className="fighter-banner">
                    {opChar && (
                        <img
                            className="fighter-img"
                            src={opExpr.image}
                            alt={opChar.name}
                            style={opExpr.facing === "right" ? { transform: "scaleX(-1)" } : undefined}
                        />
                    )}
                    <div className="fighter-nameplate opponent">{opChar?.name ?? "Opponent"}</div>
                </div>
                <div className="board-stats">
                    <div className="stat-row">
                        <span className="stat-label">Progress</span>
                        <span className="stat-value">
                            {opRevealed} / {totalSafe}
                        </span>
                    </div>
                </div>
                <MiniBoard board={opponentBoard} />
            </div>
        </div>
    );
}
