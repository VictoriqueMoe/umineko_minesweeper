interface GameOverProps {
    won: boolean;
    reason: string;
    onPlayAgain: () => void;
}

function getReasonText(reason: string, won: boolean): string {
    if (reason === "mine_hit") {
        if (won) {
            return "Your opponent struck a mine. Victory is yours.";
        }
        return "You struck a mine. The game is lost.";
    }
    if (reason === "completed") {
        if (won) {
            return "You cleared the board first. A flawless victory.";
        }
        return "Your opponent cleared the board before you.";
    }
    if (reason === "forfeit") {
        if (won) {
            return "Your opponent has disconnected. Victory by forfeit.";
        }
        return "You have forfeited the game.";
    }
    return "";
}

export function GameOver({ won, reason, onPlayAgain }: GameOverProps) {
    return (
        <div className="game-over-overlay">
            <div className="game-over-card">
                <h2 className={won ? "win" : "lose"}>{won ? "Victory" : "Defeat"}</h2>
                <p>{getReasonText(reason, won)}</p>
                <button className="btn btn-primary" onClick={onPlayAgain}>
                    Play Again
                </button>
            </div>
        </div>
    );
}
