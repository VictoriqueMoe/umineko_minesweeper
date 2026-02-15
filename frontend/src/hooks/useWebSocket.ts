import {useCallback, useEffect, useRef, useState} from "react";
import {IncomingMessage, OutgoingMessage} from "../types/game";

const SESSION_KEY = "umineko_ms_token";
const BASE_DELAY = 500;
const MAX_DELAY = 5000;

type MessageHandler = (msg: IncomingMessage) => void;

interface UseWebSocketReturn {
    send: (msg: OutgoingMessage) => void;
    connected: boolean;
}

export function getStoredToken(): string | null {
    return sessionStorage.getItem(SESSION_KEY);
}

export function storeToken(token: string): void {
    sessionStorage.setItem(SESSION_KEY, token);
}

export function clearToken(): void {
    sessionStorage.removeItem(SESSION_KEY);
}

export function useWebSocket(onMessage: MessageHandler): UseWebSocketReturn {
    const wsRef = useRef<WebSocket | null>(null);
    const onMessageRef = useRef<MessageHandler>(onMessage);
    const [connected, setConnected] = useState(false);
    const retriesRef = useRef(0);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const unmountedRef = useRef(false);
    const queueRef = useRef<string[]>([]);

    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    useEffect(() => {
        unmountedRef.current = false;

        const connect = () => {
            if (unmountedRef.current) {
                return;
            }

            const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            const url = `${protocol}//${window.location.host}/ws`;
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                setConnected(true);
                retriesRef.current = 0;
                const token = getStoredToken();
                if (token) {
                    ws.send(JSON.stringify({ type: "reconnect", token }));
                }
                for (let i = 0; i < queueRef.current.length; i++) {
                    ws.send(queueRef.current[i]);
                }
                queueRef.current = [];
            };

            ws.onclose = () => {
                setConnected(false);
                if (unmountedRef.current) {
                    return;
                }
                const delay = Math.min(BASE_DELAY * Math.pow(2, retriesRef.current), MAX_DELAY);
                retriesRef.current++;
                reconnectTimerRef.current = setTimeout(connect, delay);
            };

            ws.onmessage = event => {
                const msg: IncomingMessage = JSON.parse(event.data);
                onMessageRef.current(msg);
            };
        };

        connect();

        return () => {
            unmountedRef.current = true;
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    const send = useCallback((msg: OutgoingMessage) => {
        const data = JSON.stringify(msg);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(data);
        } else {
            queueRef.current.push(data);
        }
    }, []);

    return { send, connected };
}
