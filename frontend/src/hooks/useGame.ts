import { useCallback, useEffect, useReducer, useRef } from "react";
import { GamePhase, IncomingMessage } from "../types/game";
import { storeToken, useWebSocket } from "./useWebSocket";
import { initialState, reducer } from "./gameReducer";

export function useGame() {
    const [state, dispatch] = useReducer(reducer, initialState);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const explosionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const explosionIndexRef = useRef(0);
    const vsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hasCountdown = state.opponentDisconnected && state.disconnectCountdown > 0;

    useEffect(() => {
        if (hasCountdown) {
            countdownRef.current = setInterval(() => {
                dispatch({ type: "countdown_tick" });
            }, 1000);
        } else {
            if (countdownRef.current) {
                clearInterval(countdownRef.current);
                countdownRef.current = null;
            }
        }

        return () => {
            if (countdownRef.current) {
                clearInterval(countdownRef.current);
            }
        };
    }, [hasCountdown]);

    useEffect(() => {
        if (state.phase === GamePhase.Exploding && state.pendingMineCells.length > 0) {
            explosionIndexRef.current = 0;

            const explodeNext = () => {
                if (explosionIndexRef.current >= state.pendingMineCells.length) {
                    explosionRef.current = setTimeout(() => {
                        dispatch({ type: "explosion_done" });
                    }, 600);
                    return;
                }
                dispatch({ type: "explode_mine", index: explosionIndexRef.current });
                explosionIndexRef.current++;
                explosionRef.current = setTimeout(explodeNext, 80);
            };

            explosionRef.current = setTimeout(explodeNext, 300);
        }

        return () => {
            if (explosionRef.current) {
                clearTimeout(explosionRef.current);
            }
        };
    }, [state.phase, state.pendingMineCells]);

    useEffect(() => {
        if (state.phase === GamePhase.VsIntro) {
            vsTimerRef.current = setTimeout(() => {
                dispatch({ type: "vs_intro_done" });
            }, 3500);
        }

        return () => {
            if (vsTimerRef.current) {
                clearTimeout(vsTimerRef.current);
                vsTimerRef.current = null;
            }
        };
    }, [state.phase]);

    const onMessage = useCallback((msg: IncomingMessage) => {
        switch (msg.type) {
            case "game_created": {
                if (msg.token) {
                    storeToken(msg.token);
                }
                dispatch({ type: "game_created", code: msg.code! });
                break;
            }
            case "join_pending": {
                dispatch({
                    type: "join_pending",
                    code: msg.code!,
                    hostCharacter: msg.hostCharacter!,
                });
                break;
            }
            case "player_joined": {
                if (msg.token) {
                    storeToken(msg.token);
                }
                dispatch({ type: "player_joined", playerNumber: msg.playerNumber! });
                break;
            }
            case "game_start": {
                dispatch({
                    type: "game_start",
                    width: msg.width!,
                    height: msg.height!,
                    mines: msg.mines!,
                    characters: msg.characters ?? [],
                });
                break;
            }
            case "reconnected": {
                dispatch({
                    type: "reconnected",
                    code: msg.code!,
                    playerNumber: msg.playerNumber!,
                    width: msg.width!,
                    height: msg.height!,
                    mines: msg.mines!,
                    characters: msg.characters ?? [],
                });
                break;
            }
            case "cells_revealed": {
                dispatch({
                    type: "cells_revealed",
                    player: msg.player!,
                    cells: msg.cells!,
                });
                break;
            }
            case "cell_flagged": {
                dispatch({
                    type: "cell_flagged",
                    player: msg.player!,
                    x: msg.x!,
                    y: msg.y!,
                    flagged: msg.flagged!,
                });
                break;
            }
            case "game_over": {
                dispatch({
                    type: "game_over",
                    winner: msg.winner!,
                    loser: msg.loser!,
                    reason: msg.reason!,
                    mineCells: msg.mineCells ?? [],
                });
                break;
            }
            case "first_click_pending": {
                dispatch({ type: "first_click_pending", x: msg.x!, y: msg.y! });
                break;
            }
            case "opponent_disconnected": {
                dispatch({ type: "opponent_disconnected", countdown: msg.countdown ?? 10 });
                break;
            }
            case "opponent_reconnected": {
                dispatch({ type: "opponent_reconnected" });
                break;
            }
            case "error": {
                dispatch({ type: "error", message: msg.message! });
                break;
            }
        }
    }, []);

    const { send, connected } = useWebSocket(onMessage);

    const createGame = useCallback(
        (difficulty: string, character: string) => {
            send({ type: "create_game", difficulty, character });
        },
        [send],
    );

    const joinGame = useCallback(
        (code: string) => {
            send({ type: "join_game", code });
        },
        [send],
    );

    const selectCharacter = useCallback(
        (character: string) => {
            send({ type: "select_character", character });
        },
        [send],
    );

    const reveal = useCallback(
        (x: number, y: number) => {
            send({ type: "reveal", x, y });
        },
        [send],
    );

    const flag = useCallback(
        (x: number, y: number) => {
            send({ type: "flag", x, y });
        },
        [send],
    );

    const reset = useCallback(() => {
        dispatch({ type: "reset" });
    }, []);

    return {
        state,
        connected,
        createGame,
        joinGame,
        selectCharacter,
        reveal,
        flag,
        reset,
    };
}
