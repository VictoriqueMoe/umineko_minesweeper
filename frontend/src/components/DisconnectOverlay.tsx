interface DisconnectOverlayProps {
    countdown: number;
}

export function DisconnectOverlay({ countdown }: DisconnectOverlayProps) {
    return (
        <div className="disconnect-overlay">
            <div className="disconnect-card">
                <h2>Opponent Disconnected</h2>
                <p>Waiting for opponent to rejoin...</p>
                <div className="disconnect-countdown">{countdown}</div>
                <p className="disconnect-sub">Opponent forfeits if they don't return in time.</p>
            </div>
        </div>
    );
}
