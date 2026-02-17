import {useEffect, useState} from "react";
import {CHARACTERS, resolveExpression} from "../characters";
import {LightningCanvas} from "./LightningCanvas";

interface VsIntroProps {
    myCharacter: string;
    opponentCharacter: string;
}

export function VsIntro({ myCharacter, opponentCharacter }: VsIntroProps) {
    const [showVs, setShowVs] = useState(false);
    const [lightningActive, setLightningActive] = useState(false);
    const [fadeOut, setFadeOut] = useState(false);

    const myChar = CHARACTERS.find(c => c.id === myCharacter);
    const opChar = CHARACTERS.find(c => c.id === opponentCharacter);
    const myExpr = myChar ? resolveExpression(myChar, "default") : null;
    const opExpr = opChar ? resolveExpression(opChar, "default") : null;

    useEffect(() => {
        const vsTimer = setTimeout(() => {
            setShowVs(true);
        }, 1400);

        const lightningTimer = setTimeout(() => {
            setLightningActive(true);
        }, 1500);

        const fadeTimer = setTimeout(() => {
            setFadeOut(true);
        }, 3000);

        return () => {
            clearTimeout(vsTimer);
            clearTimeout(lightningTimer);
            clearTimeout(fadeTimer);
        };
    }, []);

    return (
        <div className={`vs-intro-overlay${fadeOut ? " fade-out" : ""}`}>
            <LightningCanvas active={lightningActive} />
            <div className="vs-intro-fighters">
                <div className="vs-intro-fighter left">
                    {myExpr && (
                        <img
                            className="vs-intro-img"
                            src={myExpr.image}
                            alt={myChar?.name ?? "You"}
                            style={myExpr.facing === "left" ? { transform: "scaleX(-1)" } : undefined}
                        />
                    )}
                    <div className="vs-intro-name">{myChar?.name ?? "You"}</div>
                </div>

                <div className={`vs-intro-text${showVs ? " visible" : ""}`}>VS</div>

                <div className="vs-intro-fighter right">
                    {opExpr && (
                        <img
                            className="vs-intro-img"
                            src={opExpr.image}
                            alt={opChar?.name ?? "Opponent"}
                            style={opExpr.facing === "right" ? { transform: "scaleX(-1)" } : undefined}
                        />
                    )}
                    <div className="vs-intro-name opponent">{opChar?.name ?? "Opponent"}</div>
                </div>
            </div>
        </div>
    );
}
