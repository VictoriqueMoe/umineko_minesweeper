import {useEffect, useRef} from "react";
import {CHARACTERS, resolveExpression} from "../characters";

interface GameOverProps {
    won: boolean;
    reason: string;
    myCharacter: string;
    opponentCharacter: string;
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

interface ConfettiParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    w: number;
    h: number;
    color: string;
    rotation: number;
    rotationSpeed: number;
    life: number;
    maxLife: number;
}

const CONFETTI_COLORS = [
    "#ffd700",
    "#ffb347",
    "#ff6b6b",
    "#c084fc",
    "#67e8f9",
    "#ffffff",
    "#f0c040",
    "#ff9ff3",
];

function ConfettiCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return;
        }

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles: ConfettiParticle[] = [];
        for (let i = 0; i < 150; i++) {
            const angle = (Math.random() * Math.PI * 2);
            const speed = 2 + Math.random() * 6;
            particles.push({
                x: canvas.width * 0.5 + (Math.random() - 0.5) * canvas.width * 0.3,
                y: canvas.height * 0.3 + (Math.random() - 0.5) * 100,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 4,
                w: 4 + Math.random() * 6,
                h: 6 + Math.random() * 10,
                color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.3,
                life: 0,
                maxLife: 120 + Math.random() * 80,
            });
        }

        let animId: number;
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let alive = 0;

            for (const p of particles) {
                p.life++;
                if (p.life > p.maxLife) {
                    continue;
                }
                alive++;

                p.vy += 0.08;
                p.vx *= 0.99;
                p.x += p.vx;
                p.y += p.vy;
                p.rotation += p.rotationSpeed;

                const fade = p.life > p.maxLife * 0.7 ? 1 - (p.life - p.maxLife * 0.7) / (p.maxLife * 0.3) : 1;

                ctx.save();
                ctx.globalAlpha = fade;
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            }

            if (alive > 0) {
                animId = requestAnimationFrame(draw);
            }
        };

        const timeout = setTimeout(() => {
            animId = requestAnimationFrame(draw);
        }, 800);

        return () => {
            clearTimeout(timeout);
            cancelAnimationFrame(animId);
        };
    }, []);

    return <canvas ref={canvasRef} className="confetti-canvas" />;
}

export function GameOver({ won, reason, myCharacter, opponentCharacter, onPlayAgain }: GameOverProps) {
    const myChar = CHARACTERS.find(c => c.id === myCharacter);
    const opChar = CHARACTERS.find(c => c.id === opponentCharacter);

    const myExpr = myChar ? resolveExpression(myChar, won ? "win" : "lose") : null;
    const opExpr = opChar ? resolveExpression(opChar, won ? "lose" : "win") : null;

    return (
        <div className="game-over-overlay">
            {won && <ConfettiCanvas />}
            <div className="showdown">
                <div className="showdown-fighter left">
                    {myExpr && (
                        <img
                            className="showdown-img"
                            src={myExpr.image}
                            alt={myChar?.name ?? "You"}
                            style={myExpr.facing === "left" ? { transform: "scaleX(-1)" } : undefined}
                        />
                    )}
                    <div className={`showdown-label ${won ? "win" : "lose"}`}>
                        {won ? `${myChar?.name ?? "You"} Wins` : "Defeat"}
                    </div>
                </div>
                <div className="showdown-vs">VS</div>
                <div className="showdown-fighter right">
                    {opExpr && (
                        <img
                            className="showdown-img"
                            src={opExpr.image}
                            alt={opChar?.name ?? "Opponent"}
                            style={opExpr.facing === "right" ? { transform: "scaleX(-1)" } : undefined}
                        />
                    )}
                    <div className={`showdown-label ${won ? "lose" : "win"}`}>
                        {won ? "Defeat" : `${opChar?.name ?? "Opponent"} Wins`}
                    </div>
                </div>
            </div>
            <div className="showdown-info">
                <p>{getReasonText(reason, won)}</p>
                <button className="btn btn-primary" onClick={onPlayAgain}>
                    Play Again
                </button>
            </div>
        </div>
    );
}
