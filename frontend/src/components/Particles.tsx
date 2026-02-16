import { useEffect, useRef } from "react";

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    char: string;
    hue: number;
}

const CHARS = ["\u2726", "\u2727", "\u2729", "\u271B", "\u2730"];

function getParticleHue(): number {
    const val = getComputedStyle(document.documentElement).getPropertyValue("--particle-hue").trim();
    return val ? parseFloat(val) : 35;
}

export function Particles() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const animRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return;
        }

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener("resize", resize);

        const spawn = () => {
            if (particlesRef.current.length >= 30) {
                return;
            }
            particlesRef.current.push({
                x: Math.random() * canvas.width,
                y: canvas.height + 10,
                vx: (Math.random() - 0.5) * 0.4,
                vy: -(0.3 + Math.random() * 0.5),
                life: 0,
                maxLife: 400 + Math.random() * 300,
                size: 8 + Math.random() * 10,
                char: CHARS[Math.floor(Math.random() * CHARS.length)],
                hue: getParticleHue() + Math.random() * 20,
            });
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (Math.random() < 0.04) {
                spawn();
            }

            for (let i = particlesRef.current.length - 1; i >= 0; i--) {
                const p = particlesRef.current[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vx += (Math.random() - 0.5) * 0.02;
                p.life++;

                const progress = p.life / p.maxLife;
                let alpha = 1;
                if (progress < 0.1) {
                    alpha = progress / 0.1;
                } else if (progress > 0.7) {
                    alpha = 1 - (progress - 0.7) / 0.3;
                }

                if (p.life >= p.maxLife) {
                    particlesRef.current.splice(i, 1);
                    continue;
                }

                ctx.save();
                ctx.globalAlpha = alpha * 0.4;
                ctx.font = `${p.size}px serif`;
                ctx.fillStyle = `hsl(${p.hue}, 70%, 65%)`;
                ctx.shadowColor = `hsla(${p.hue}, 80%, 60%, 0.6)`;
                ctx.shadowBlur = 15;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(p.char, p.x, p.y);
                ctx.restore();
            }

            animRef.current = requestAnimationFrame(draw);
        };

        animRef.current = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(animRef.current);
            window.removeEventListener("resize", resize);
        };
    }, []);

    return <canvas ref={canvasRef} className="particles-canvas" />;
}
