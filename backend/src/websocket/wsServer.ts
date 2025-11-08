import { WebSocketServer } from "ws";
import SocketClient from "./client.js";

export function initWebSocketServer() {
    const wss = new WebSocketServer({ port: 8080 });
    wss.on('connection', (ws) => {
        new SocketClient(ws);
    });
}
