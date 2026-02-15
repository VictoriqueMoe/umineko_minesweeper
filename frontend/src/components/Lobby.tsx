import * as React from "react";
import {useState} from "react";
import {GamePhase} from "../types/game";
import {Spinner} from "./Spinner";

interface LobbyProps {
    phase: GamePhase;
    roomCode: string;
    error: string;
    connected: boolean;
    onCreateGame: () => void;
    onJoinGame: (code: string) => void;
}

export function Lobby({ phase, roomCode, error, connected, onCreateGame, onJoinGame }: LobbyProps) {
    const [joinCode, setJoinCode] = useState("");

    const handleJoin = () => {
        const trimmed = joinCode.trim();
        if (trimmed) {
            onJoinGame(trimmed);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleJoin();
        }
    };

    if (phase === GamePhase.Waiting) {
        return (
            <div className="lobby">
                <div className="lobby-card">
                    <h2>Game Created</h2>
                    <p>Share this code with your opponent:</p>
                    <div className="room-code">{roomCode}</div>
                    <p className="waiting-text">Waiting for opponent to join...</p>
                    <Spinner />
                </div>
            </div>
        );
    }

    return (
        <div className="lobby">
            <div className="lobby-card">
                <h2>Create a Game</h2>
                <p>Start a new game and invite your opponent with a code.</p>
                <button className="btn btn-primary" onClick={onCreateGame} disabled={!connected}>
                    Create Game
                </button>
            </div>

            <div className="lobby-card">
                <h2>Join a Game</h2>
                <p>Enter the code shared by your opponent.</p>
                <input
                    className="lobby-input"
                    type="text"
                    placeholder="Enter room code..."
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    onKeyDown={handleKeyDown}
                    maxLength={6}
                    disabled={!connected}
                />
                <div style={{ marginTop: "1rem" }}>
                    <button
                        className="btn btn-primary"
                        onClick={handleJoin}
                        disabled={!connected || joinCode.trim().length === 0}
                    >
                        Join Game
                    </button>
                </div>
                {error && <div className="error-text">{error}</div>}
            </div>

            {!connected && (
                <div className="error-text" style={{ textAlign: "center" }}>
                    Connecting to server...
                </div>
            )}
        </div>
    );
}
