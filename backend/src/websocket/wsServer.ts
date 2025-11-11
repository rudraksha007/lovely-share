import { WebSocketServer } from "ws";
import SocketClient from "./client.js";

export function initWebSocketServer(port = 8080) {
    const wss = new WebSocketServer({ port });
    wss.on('connection', (ws) => {
        new SocketClient(ws);
    });
    console.log(`Websocket server is running on port: ${port}`);
}
