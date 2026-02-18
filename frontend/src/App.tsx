import { useCallback, useEffect, useState } from "react";
import { GamePhase } from "./types/game";
import { useGame } from "./hooks/useGame";
import { Lobby } from "./components/Lobby";
import { CharacterSelect } from "./components/CharacterSelect";
import { Game } from "./components/Game";
import { GameOver } from "./components/GameOver";
import { DisconnectOverlay } from "./components/DisconnectOverlay";
import { ConnectionLostOverlay } from "./components/ConnectionLostOverlay";
import { Particles } from "./components/Particles";
import { VsIntro } from "./components/VsIntro";
import { Footer } from "./components/Footer";

const THEME_CLASSES = ["theme-bernkastel", "theme-erika", "theme-lambdadelta"];

export function App() {
    const { state, connected, createGame, joinGame, selectCharacter, reveal, flag, reset } = useGame();
    const [previewCharacter, setPreviewCharacter] = useState("");

    useEffect(() => {
        const root = document.documentElement;
        THEME_CLASSES.forEach(cls => root.classList.remove(cls));
        const activeCharacter = state.myCharacter || previewCharacter;
        if (activeCharacter) {
            root.classList.add(`theme-${activeCharacter}`);
        }
    }, [state.myCharacter, previewCharacter]);

    const handleReset = useCallback(() => {
        setPreviewCharacter("");
        reset();
    }, [reset]);

    const handleCharacterSelect = useCallback(
        (character: string) => {
            setPreviewCharacter(character);
            selectCharacter(character);
        },
        [selectCharacter],
    );

    const showBoard =
        state.phase === GamePhase.Playing || state.phase === GamePhase.Exploding || state.phase === GamePhase.Finished;

    return (
        <>
            <Particles />

            <header className="header">
                <h1>Minesweeper</h1>
                <div className="ornament">&#10022; &#10022; &#10022;</div>
            </header>

            {(state.phase === GamePhase.Lobby || state.phase === GamePhase.Waiting) && (
                <Lobby
                    phase={state.phase}
                    roomCode={state.roomCode}
                    error={state.error}
                    connected={connected}
                    onCreateGame={createGame}
                    onJoinGame={joinGame}
                    onCharacterPreview={setPreviewCharacter}
                />
            )}

            {state.phase === GamePhase.CharacterSelect && (
                <CharacterSelect hostCharacter={state.hostCharacter} onSelect={handleCharacterSelect} />
            )}

            {state.phase === GamePhase.VsIntro && (
                <VsIntro myCharacter={state.myCharacter} opponentCharacter={state.opponentCharacter} />
            )}

            {showBoard && state.myBoard && state.opponentBoard && (
                <Game
                    phase={state.phase}
                    myBoard={state.myBoard}
                    opponentBoard={state.opponentBoard}
                    myCharacter={state.myCharacter}
                    opponentCharacter={state.opponentCharacter}
                    pendingClick={state.pendingClick}
                    winner={state.winner}
                    playerNumber={state.playerNumber}
                    onReveal={reveal}
                    onFlag={flag}
                />
            )}

            {state.phase === GamePhase.Finished && (
                <GameOver
                    won={state.winner === state.playerNumber}
                    reason={state.reason}
                    myCharacter={state.myCharacter}
                    opponentCharacter={state.opponentCharacter}
                    onPlayAgain={handleReset}
                />
            )}

            {state.opponentDisconnected && state.phase === GamePhase.Playing && (
                <DisconnectOverlay countdown={state.disconnectCountdown} />
            )}

            {!connected && state.phase !== GamePhase.Lobby && <ConnectionLostOverlay />}

            <Footer />
        </>
    );
}
