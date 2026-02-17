import {useEffect, useRef} from "react";
import {getGameOverAudio} from "../audio";

export function useGameAudio(myCharacter: string, opponentCharacter: string, won: boolean) {
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const url = getGameOverAudio(myCharacter, opponentCharacter, won);
        if (!url) {
            return;
        }

        const audio = new Audio(url);
        audioRef.current = audio;
        audio.play().catch(() => {});

        return () => {
            audio.pause();
            audio.src = "";
            audioRef.current = null;
        };
    }, [myCharacter, opponentCharacter, won]);
}
