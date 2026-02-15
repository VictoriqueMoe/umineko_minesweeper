import {Spinner} from "./Spinner";

export function ConnectionLostOverlay() {
    return (
        <div className="disconnect-overlay">
            <div className="disconnect-card">
                <h2>Connection Lost</h2>
                <p>Attempting to reconnect...</p>
                <Spinner />
            </div>
        </div>
    );
}
