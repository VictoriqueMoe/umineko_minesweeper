import * as React from "react";
import { useRef } from "react";
import { CellState, ClientCell } from "../types/game";

interface CellProps {
    cell: ClientCell;
    pending: boolean;
    onClick: () => void;
    onContextMenu: () => void;
    disabled: boolean;
}

export function Cell({ cell, pending, onClick, onContextMenu, disabled }: CellProps) {
    const deniedRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (disabled) {
            return;
        }
        if (e.button === 0) {
            onClick();
        } else if (e.button === 2) {
            onContextMenu();
        }
    };

    const handleFlaggedMouseDown = (e: React.MouseEvent) => {
        if (disabled) {
            return;
        }
        if (e.button === 0) {
            if (deniedRef.current) {
                deniedRef.current.classList.remove("denied");
                void deniedRef.current.offsetWidth;
                deniedRef.current.classList.add("denied");
            }
        } else if (e.button === 2) {
            onContextMenu();
        }
    };

    const preventContext = (e: React.MouseEvent) => {
        e.preventDefault();
    };

    if (cell.state === CellState.Exploding) {
        return (
            <div className="cell mine exploding">
                <span className="mine-icon">&#10006;</span>
            </div>
        );
    }

    if (cell.state === CellState.Flagged) {
        return (
            <div
                ref={deniedRef}
                className="cell flagged"
                onMouseDown={handleFlaggedMouseDown}
                onContextMenu={preventContext}
            >
                <span className="flag-icon">&#9873;</span>
            </div>
        );
    }

    if (cell.state === CellState.Revealed) {
        if (cell.value === -1) {
            return (
                <div className="cell mine">
                    <span className="mine-icon">&#10006;</span>
                </div>
            );
        }

        return (
            <div
                className={`cell revealed${cell.value > 0 ? ` val-${cell.value}` : ""}`}
                style={
                    cell.animDelay > 0 ? ({ "--anim-delay": `${cell.animDelay}ms` } as React.CSSProperties) : undefined
                }
            >
                {cell.value > 0 ? cell.value : ""}
            </div>
        );
    }

    return (
        <div
            className={`cell hidden${pending ? " pending" : ""}`}
            onMouseDown={handleMouseDown}
            onContextMenu={preventContext}
            style={disabled ? { cursor: "default" } : undefined}
        />
    );
}
