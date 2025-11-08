import { configDotenv } from 'dotenv';
import express from 'express';
import { WebSocketServer } from 'ws';
import { initWebSocketServer } from './websocket/wsServer.js';

configDotenv();

const app = express();
const PORT = process.env.PORT || 3000;
initWebSocketServer();


app.get('/', (req, res) => {
    res.send('Hello, World!');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});