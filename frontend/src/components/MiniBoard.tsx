import {BoardState, CellState} from "../types/game";
import * as React from "react";

interface MiniBoardProps {
    board: BoardState;
}

export function MiniBoard({ board }: MiniBoardProps) {
    const cells = [];
    for (let y = 0; y < board.height; y++) {
        for (let x = 0; x < board.width; x++) {
            const cell = board.cells[y][x];
            let className = "cell hidden";
            if (cell.state === CellState.Exploding) {
                className = "cell mine exploding";
            } else if (cell.state === CellState.Revealed) {
                if (cell.value === -1) {
                    className = "cell mine";
                } else {
                    className = "cell revealed";
                }
            } else if (cell.state === CellState.Flagged) {
                className = "cell flagged";
            }
            cells.push(<div key={`${x}-${y}`} className={className} />);
        }
    }

    return (
        <div
            className="board mini"
            style={
                {
                    "--cols": board.width,
                    "--rows": board.height,
                } as React.CSSProperties
            }
        >
            {cells}
        </div>
    );
}
