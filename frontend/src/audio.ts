interface AudioConfig {
    default?: {
        win?: string;
        lose?: string;
    };
    matchups?: {
        [opponentId: string]: {
            win?: string;
            lose?: string;
        };
    };
}

const CHARACTER_AUDIO: Record<string, AudioConfig> = {
    bernkastel: {
        default: {
            lose: "https://quotes.auaurora.moe/api/v1/audio/28/82100692",
            win: "https://quotes.auaurora.moe/api/v1/audio/combined?segments=28:72100547,28:72100548,28:72100549",
        },
        matchups: {
            lambdadelta: {
                lose: "https://quotes.auaurora.moe/api/v1/audio/28/82100517",
            },
        },
    },
    erika: {
        default: {
            win: "https://quotes.auaurora.moe/api/v1/audio/combined?segments=46:64501228,46:64501229,46:64501230",
            lose: "https://quotes.auaurora.moe/api/v1/audio/combined?segments=46:54500569,46:54500571,46:54500572",
        },
        matchups: {},
    },
    lambdadelta: {
        default: {
            win: "https://quotes.auaurora.moe/api/v1/audio/combined?segments=29:92200077,29:92200078,29:92200079",
            lose: "https://quotes.auaurora.moe/api/v1/audio/combined?segments=29:82200264,29:82200265",
        },
        matchups: {},
    },
};

export function getGameOverAudio(myCharacter: string, opponentCharacter: string, won: boolean): string | null {
    const config = CHARACTER_AUDIO[myCharacter];
    if (!config) {
        return null;
    }

    const key = won ? "win" : "lose";
    const matchup = config.matchups?.[opponentCharacter];

    return matchup?.[key] ?? config.default?.[key] ?? null;
}
