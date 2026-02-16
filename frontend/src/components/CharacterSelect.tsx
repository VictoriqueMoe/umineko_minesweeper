import {CHARACTERS} from "../characters";

interface CharacterSelectProps {
    hostCharacter: string;
    onSelect: (character: string) => void;
}

export function CharacterSelect({ hostCharacter, onSelect }: CharacterSelectProps) {
    return (
        <div className="character-select-screen">
            <h2>Choose Your Character</h2>
            <p>Select a character to begin the game.</p>
            <div className="character-select-grid">
                {CHARACTERS.map(c => {
                    const taken = c.id === hostCharacter;
                    return (
                        <button
                            key={c.id}
                            className={`character-select-card${taken ? " taken" : ""}`}
                            onClick={() => !taken && onSelect(c.id)}
                            disabled={taken}
                        >
                            <img
                                className="character-select-portrait"
                                src={c.image}
                                alt={c.name}
                            />
                            <span className="character-select-name">{c.name}</span>
                            {taken && <span className="character-taken-label">Opponent</span>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
