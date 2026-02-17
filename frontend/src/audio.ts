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
            lose: "https://quotes.auaurora.moe/?quote=82100692"
            // win: "",
        },
        matchups: {
            lambdadelta: {
                lose: "https://quotes.auaurora.moe/api/v1/audio/28/82100517",
            },
        },
    },
    erika: {
        default: {
            win: "https://quotes.auaurora.moe/?builder=46:64501228,46:64501229,46:64501230",
            // lose: "",
        },
        matchups: {},
    },
    lambdadelta: {
        default: {
            win: "",
            // lose: "",
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
