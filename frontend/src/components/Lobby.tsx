import * as React from "react";
import {useState} from "react";
import {GamePhase} from "../types/game";
import {CHARACTERS} from "../characters";
import {Spinner} from "./Spinner";

const DIFFICULTIES = [
    { value: "easy", label: "Easy", desc: "9\u00d79, 10 mines" },
    { value: "medium", label: "Medium", desc: "16\u00d716, 40 mines" },
    { value: "hard", label: "Hard", desc: "30\u00d716, 99 mines" },
] as const;

interface LobbyProps {
    phase: GamePhase;
    roomCode: string;
    error: string;
    connected: boolean;
    onCreateGame: (difficulty: string, character: string) => void;
    onJoinGame: (code: string) => void;
    onCharacterPreview: (character: string) => void;
}

function CharacterSelector({
    selected,
    onSelect,
}: {
    selected: string;
    onSelect: (id: string) => void;
}) {
    return (
        <div className="character-selector">
            {CHARACTERS.map(c => (
                <button
                    key={c.id}
                    className={`character-card${selected === c.id ? " selected" : ""}`}
                    onClick={() => onSelect(c.id)}
                >
                    <img className="character-portrait" src={c.image} alt={c.name} />
                    <span className="character-name">{c.name}</span>
                </button>
            ))}
        </div>
    );
}

export function Lobby({ phase, roomCode, error, connected, onCreateGame, onJoinGame, onCharacterPreview }: LobbyProps) {
    const [joinCode, setJoinCode] = useState("");
    const [difficulty, setDifficulty] = useState("medium");
    const [createCharacter, setCreateCharacter] = useState("");

    const handleCreateCharacterSelect = (id: string) => {
        setCreateCharacter(id);
        onCharacterPreview(id);
    };

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
                <p>Choose your character and start a new game.</p>
                <CharacterSelector selected={createCharacter} onSelect={handleCreateCharacterSelect} />
                <div className="difficulty-selector">
                    {DIFFICULTIES.map(d => (
                        <button
                            key={d.value}
                            className={`difficulty-option${difficulty === d.value ? " selected" : ""}`}
                            onClick={() => setDifficulty(d.value)}
                        >
                            <span className="difficulty-label">{d.label}</span>
                            <span className="difficulty-desc">{d.desc}</span>
                        </button>
                    ))}
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => onCreateGame(difficulty, createCharacter)}
                    disabled={!connected || !createCharacter}
                >
                    Create Game
                </button>
            </div>

            <div className="lobby-card">
                <h2>Join a Game</h2>
                <p>Enter the room code from your opponent.</p>
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
