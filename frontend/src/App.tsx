import {GamePhase} from "./types/game";
import {useGame} from "./hooks/useGame";
import {Lobby} from "./components/Lobby";
import {Game} from "./components/Game";
import {GameOver} from "./components/GameOver";
import {DisconnectOverlay} from "./components/DisconnectOverlay";
import {ConnectionLostOverlay} from "./components/ConnectionLostOverlay";
import {Particles} from "./components/Particles";

export function App() {
    const { state, connected, createGame, joinGame, reveal, flag, reset } = useGame();

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
                />
            )}

            {showBoard && state.myBoard && state.opponentBoard && (
                <Game
                    phase={state.phase}
                    playerNumber={state.playerNumber}
                    myBoard={state.myBoard}
                    opponentBoard={state.opponentBoard}
                    onReveal={reveal}
                    onFlag={flag}
                />
            )}

            {state.phase === GamePhase.Finished && (
                <GameOver won={state.winner === state.playerNumber} reason={state.reason} onPlayAgain={reset} />
            )}

            {state.opponentDisconnected && state.phase === GamePhase.Playing && (
                <DisconnectOverlay countdown={state.disconnectCountdown} />
            )}

            {!connected && state.phase !== GamePhase.Lobby && (
                <ConnectionLostOverlay />
            )}
        </>
    );
}
