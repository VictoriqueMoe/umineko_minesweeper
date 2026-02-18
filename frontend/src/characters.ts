import { Mood } from "./types/game";

export type Facing = "left" | "right" | "center";

export interface Expression {
    image: string;
    facing: Facing;
}

export interface CharacterDef {
    id: string;
    name: string;
    image: string;
    expressions: Partial<Record<Mood, Expression>>;
}

const MOOD_FALLBACKS: Record<Mood, Mood[]> = {
    default: [],
    neutral: ["default"],
    happy: ["smirk", "neutral", "default"],
    very_happy: ["happy", "smirk", "default"],
    smirk: ["happy", "neutral", "default"],
    worried: ["sweating", "neutral", "default"],
    sweating: ["worried", "neutral", "default"],
    angry: ["furious", "sweating", "neutral", "default"],
    furious: ["angry", "sweating", "neutral", "default"],
    surprised: ["worried", "neutral", "default"],
    relieved: ["happy", "neutral", "default"],
    bored: ["neutral", "default"],
    wink: ["smirk", "happy", "default"],
    win: ["very_happy", "happy", "default"],
    lose: ["furious", "angry", "worried", "default"],
};

export function resolveExpression(character: CharacterDef, mood: Mood): Expression {
    if (character.expressions[mood]) {
        return character.expressions[mood];
    }
    for (const fb of MOOD_FALLBACKS[mood]) {
        if (character.expressions[fb]) {
            return character.expressions[fb];
        }
    }
    return character.expressions.default ?? { image: character.image, facing: "center" };
}

export const CHARACTERS: CharacterDef[] = [
    {
        id: "bernkastel",
        name: "Bernkastel",
        image: "/characters/bernkastel/bern-default.png",
        expressions: {
            default: { image: "/characters/bernkastel/bern-default.png", facing: "right" },
            neutral: { image: "/characters/bernkastel/bern-neutral.png", facing: "center" },
            happy: { image: "/characters/bernkastel/bern-happy.png", facing: "center" },
            smirk: { image: "/characters/bernkastel/bern-smirk.png", facing: "center" },
            worried: { image: "/characters/bernkastel/bern-worried.png", facing: "center" },
            sweating: { image: "/characters/bernkastel/bern-sweating.png", facing: "center" },
            angry: { image: "/characters/bernkastel/bern-angry.png", facing: "center" },
            furious: { image: "/characters/bernkastel/bern_furious.png", facing: "center" },
            surprised: { image: "/characters/bernkastel/bern-supprised.png", facing: "center" },
            relieved: { image: "/characters/bernkastel/bern_relived.png", facing: "center" },
            bored: { image: "/characters/bernkastel/bern-board.png", facing: "center" },
            win: { image: "/characters/bernkastel/bern-win.png", facing: "center" },
            lose: { image: "/characters/bernkastel/bern-lose.png", facing: "center" },
        },
    },
    {
        id: "erika",
        name: "Erika Furudo",
        image: "/characters/erika/erika-default.png",
        expressions: {
            default: { image: "/characters/erika/erika-default.png", facing: "left" },
            neutral: { image: "/characters/erika/erika-neutral.png", facing: "right" },
            happy: { image: "/characters/erika/erika-happy.png", facing: "right" },
            very_happy: { image: "/characters/erika/erika-very_happy.png", facing: "right" },
            smirk: { image: "/characters/erika/eria-smirk.png", facing: "right" },
            surprised: { image: "/characters/erika/erika-suprised.png", facing: "right" },
            furious: { image: "/characters/erika/erika-furious.png", facing: "right" },
            wink: { image: "/characters/erika/erika-wink.png", facing: "right" },
            win: { image: "/characters/erika/erika-win.png", facing: "right" },
            lose: { image: "/characters/erika/erika-lose.png", facing: "right" },
        },
    },
    {
        id: "lambdadelta",
        name: "Lambdadelta",
        image: "/characters/lambdadelta/lambdadelta-default.png",
        expressions: {
            default: { image: "/characters/lambdadelta/lambdadelta-default.png", facing: "left" },
            happy: { image: "/characters/lambdadelta/lambdadelta-happy.png", facing: "right" },
            very_happy: { image: "/characters/lambdadelta/lambdadelta-very_happy.png", facing: "right" },
            smirk: { image: "/characters/lambdadelta/lambdadelta-smirk.png", facing: "right" },
            worried: { image: "/characters/lambdadelta/lambdadelta-upset.png", facing: "right" },
            win: { image: "/characters/lambdadelta/lambdadelta-win.png", facing: "right" },
            lose: { image: "/characters/lambdadelta/lambdadelta-lose.png", facing: "right" },
        },
    },
];
