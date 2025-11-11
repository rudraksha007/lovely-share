import { configDotenv } from 'dotenv';
import { initWebSocketServer } from './websocket/wsServer.js';

configDotenv();

const PORT = parseInt(process.env.PORT || '3001');
initWebSocketServer(PORT);