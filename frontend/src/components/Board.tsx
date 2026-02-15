import * as React from "react";
import {useEffect, useRef} from "react";
import {BoardState, CellState, GamePhase} from "../types/game";
import {Cell} from "./Cell";
import {SparkleCanvas, SparkleHandle} from "./SparkleCanvas";

interface BoardProps {
    board: BoardState;
    phase: GamePhase;
    onReveal: (x: number, y: number) => void;
    onFlag: (x: number, y: number) => void;
}

export function Board({ board, phase, onReveal, onFlag }: BoardProps) {
    const disabled = phase !== GamePhase.Playing;
    const sparkleRef = useRef<SparkleHandle>(null);
    const prevRevealedRef = useRef<boolean[][] | null>(null);

    useEffect(() => {
        const prev = prevRevealedRef.current;
        const next: boolean[][] = [];

        for (let y = 0; y < board.height; y++) {
            next[y] = [];
            for (let x = 0; x < board.width; x++) {
                next[y][x] = board.cells[y][x].state === CellState.Revealed;
            }
        }

        if (prev && sparkleRef.current) {
            let newCount = 0;
            const cellSize = 32;

            for (let y = 0; y < board.height; y++) {
                for (let x = 0; x < board.width; x++) {
                    if (next[y][x] && !prev[y][x]) {
                        newCount++;
                    }
                }
            }

            const perCell = newCount > 10 ? 3 : newCount > 1 ? 5 : 8;

            for (let y = 0; y < board.height; y++) {
                for (let x = 0; x < board.width; x++) {
                    if (next[y][x] && !prev[y][x]) {
                        const cx = x * (cellSize + 1) + cellSize / 2 + 2;
                        const cy = y * (cellSize + 1) + cellSize / 2 + 2;
                        const delay = board.cells[y][x].animDelay;
                        if (delay > 0) {
                            setTimeout(() => {
                                if (sparkleRef.current) {
                                    sparkleRef.current.burst(cx, cy, perCell);
                                }
                            }, delay);
                        } else {
                            sparkleRef.current.burst(cx, cy, perCell);
                        }
                    }
                }
            }
        }

        prevRevealedRef.current = next;
    }, [board]);

    const rows = [];
    for (let y = 0; y < board.height; y++) {
        for (let x = 0; x < board.width; x++) {
            rows.push(
                <Cell
                    key={`${x}-${y}`}
                    cell={board.cells[y][x]}
                    onClick={() => onReveal(x, y)}
                    onContextMenu={() => onFlag(x, y)}
                    disabled={disabled}
                />,
            );
        }
    }

    return (
        <div className="board-wrapper">
            <div
                className={`board main${phase === GamePhase.Exploding ? " exploding" : ""}`}
                style={
                    {
                        "--cols": board.width,
                        "--rows": board.height,
                    } as React.CSSProperties
                }
            >
                {rows}
            </div>
            <SparkleCanvas ref={sparkleRef} />
        </div>
    );
}
