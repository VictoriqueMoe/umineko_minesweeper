import {useEffect, useMemo, useRef, useState} from "react";
import {BoardState, CellState, GamePhase, Mood} from "../types/game";
import {CharacterDef, Expression, resolveExpression} from "../characters";

interface MoodInput {
    phase: GamePhase;
    myBoard: BoardState | null;
    opponentBoard: BoardState | null;
    winner: number;
    playerNumber: number;
    myCharacter: CharacterDef | undefined;
    opponentCharacter: CharacterDef | undefined;
}

const INVERSE_MOOD: Partial<Record<Mood, Mood>> = {
    happy: "worried",
    very_happy: "angry",
    smirk: "sweating",
    worried: "happy",
    sweating: "smirk",
    angry: "very_happy",
    furious: "very_happy",
    relieved: "worried",
    surprised: "surprised",
};

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

function computeProgressMood(diff: number, totalSafe: number): Mood {
    const ratio = diff / totalSafe;
    if (ratio > 0.15) {
        return "very_happy";
    }
    if (ratio > 0.08) {
        return "smirk";
    }
    if (ratio > 0.03) {
        return "happy";
    }
    if (ratio > -0.03) {
        return "neutral";
    }
    if (ratio > -0.08) {
        return "worried";
    }
    if (ratio > -0.15) {
        return "sweating";
    }
    if (ratio > -0.25) {
        return "angry";
    }
    return "furious";
}

const REACTION_DURATION = 2500;
const REVERT_TO_DEFAULT_AFTER = 8000;

export function useCharacterMood({
    phase,
    myBoard,
    opponentBoard,
    winner,
    playerNumber,
    myCharacter,
    opponentCharacter,
}: MoodInput) {
    const [reactionMood, setReactionMood] = useState<Mood | null>(null);
    const [idleReverted, setIdleReverted] = useState(false);
    const reactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const revertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const myRevealed = useMemo(() => (myBoard ? countRevealed(myBoard) : 0), [myBoard]);
    const opRevealed = useMemo(() => (opponentBoard ? countRevealed(opponentBoard) : 0), [opponentBoard]);
    const totalSafe = myBoard ? myBoard.width * myBoard.height - myBoard.mines : 0;
    const diff = myRevealed - opRevealed;

    const [tracked, setTracked] = useState({ myRevealed: 0, opRevealed: 0, diff: 0, playing: false });

    const isPlaying = phase === GamePhase.Playing;
    const boardChanged = isPlaying && (tracked.myRevealed !== myRevealed || tracked.opRevealed !== opRevealed);
    const leftPlaying = !isPlaying && tracked.playing;

    if (boardChanged) {
        const opJustRevealed = opRevealed - tracked.opRevealed;
        const wasBehind = tracked.diff < 0;
        const nowAhead = diff > 0;

        let detected: Mood | null = null;
        if (tracked.myRevealed > 0 && opJustRevealed > 5) {
            detected = "surprised";
        } else if (tracked.myRevealed > 0 && wasBehind && nowAhead) {
            detected = "relieved";
        }

        setTracked({ myRevealed, opRevealed, diff, playing: true });

        if (detected && detected !== reactionMood) {
            setReactionMood(detected);
        }
        if (idleReverted) {
            setIdleReverted(false);
        }
    }

    if (leftPlaying) {
        setTracked({ myRevealed: 0, opRevealed: 0, diff: 0, playing: false });
        if (reactionMood !== null) {
            setReactionMood(null);
        }
    }

    if (isPlaying && !tracked.playing) {
        setTracked({ myRevealed, opRevealed, diff, playing: true });
    }

    useEffect(() => {
        if (!reactionMood) {
            return;
        }
        if (reactionTimerRef.current) {
            clearTimeout(reactionTimerRef.current);
        }
        reactionTimerRef.current = setTimeout(() => {
            setReactionMood(null);
        }, REACTION_DURATION);
        return () => {
            if (reactionTimerRef.current) {
                clearTimeout(reactionTimerRef.current);
            }
        };
    }, [reactionMood]);

    useEffect(() => {
        if (!isPlaying) {
            return;
        }
        if (revertTimerRef.current) {
            clearTimeout(revertTimerRef.current);
        }
        revertTimerRef.current = setTimeout(() => {
            setIdleReverted(true);
        }, REVERT_TO_DEFAULT_AFTER);
        return () => {
            if (revertTimerRef.current) {
                clearTimeout(revertTimerRef.current);
            }
        };
    }, [isPlaying, myRevealed, opRevealed]);

    useEffect(() => {
        return () => {
            if (reactionTimerRef.current) {
                clearTimeout(reactionTimerRef.current);
            }
            if (revertTimerRef.current) {
                clearTimeout(revertTimerRef.current);
            }
        };
    }, []);

    let myMood: Mood = "default";
    let opMood: Mood = "default";

    if (phase === GamePhase.Finished || phase === GamePhase.Exploding) {
        const iWon = winner === playerNumber;
        myMood = iWon ? "win" : "lose";
        opMood = iWon ? "lose" : "win";
    } else if (isPlaying) {
        if (reactionMood) {
            myMood = reactionMood;
            opMood = INVERSE_MOOD[reactionMood] ?? "neutral";
        } else if (idleReverted) {
            myMood = "default";
            opMood = "default";
        } else {
            myMood = computeProgressMood(diff, totalSafe);
            opMood = INVERSE_MOOD[myMood] ?? "neutral";
        }
    }

    const defaultExpr: Expression = { image: "", facing: "center" };
    const myExpr = myCharacter ? resolveExpression(myCharacter, myMood) : defaultExpr;
    const opExpr = opponentCharacter ? resolveExpression(opponentCharacter, opMood) : defaultExpr;

    return { myExpr, opExpr };
}
