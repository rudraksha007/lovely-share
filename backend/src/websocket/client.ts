import type WebSocket from "ws";
import { generateUUID } from "../utils.js";
import SocketMessage from "./message.js";
import type ServerMessage from "./server-message.js";
import { AnswerAckMessage, AnswerMessage, IceAckMessage, IceMessage, OfferAckMessage, OfferMessage } from "./server-message.js";

export default class SocketClient {
    static clients: Map<string, SocketClient> = new Map();
    private socket: WebSocket;
    private id: string;
    private name: string = "Anonymous";

    constructor(socket: WebSocket, id?: string) {
        this.socket = socket;
        this.id = id || generateUUID();
        SocketClient.clients.set(this.id, this);
        this.hookEvents();
    }

    private hookEvents() {
        this.socket.on('message', (message) => {
            const msg = new SocketMessage(message);
            switch (msg.getType()) {
                case 'INIT': {
                    const initData = msg.getAsInit();
                    this.name = initData.userName;
                    console.log(`Client ${this.id} initialized with name ${this.name}`);
                    break;
                }
                case 'OFFER': {
                    const offerData = msg.getAsOffer();
                    const targetClient = SocketClient.clients.get(offerData.targetId);
                    if (!targetClient) {
                        this.sendMsg(new OfferAckMessage(offerData.targetId, { success: false, message: "Target client not found" }));
                        return;
                    }
                    targetClient.sendMsg(new OfferMessage({ fromId: this.id, offer: offerData.offer, password: offerData.password }));
                    this.sendMsg(new OfferAckMessage(offerData.targetId, { success: true }));
                    break;
                }
                case 'ANSWER': {
                    const answerData = msg.getAsAnswer();
                    const targetClient = SocketClient.clients.get(answerData.targetId);
                    if (!targetClient) {
                        this.sendMsg(new AnswerAckMessage({ success: false, message: "Target client not found" }));
                        return;
                    }
                    targetClient.sendMsg(new AnswerMessage({ fromId: this.id, answer: answerData.answer, password: answerData.password }));
                    this.sendMsg(new AnswerAckMessage({ success: true }));
                    break;
                }
                case 'ICE': {
                    const iceData = msg.getAsIce();
                    const targetClient = SocketClient.clients.get(iceData.targetId);
                    if (!targetClient) {
                        this.sendMsg(new IceAckMessage({ success: false, message: "Target client not found" }));
                        return;
                    }
                    targetClient.sendMsg(new IceMessage({ fromId: this.id, iceCandidate: iceData.iceCandidate }));
                    this.sendMsg(new IceAckMessage({ success: true }));
                    break;
                }
                case 'CLOSE': {
                    this.disconnect();
                    break;
                }
            }
        });
        this.socket.on('error', (error) => {
            this.disconnect();
        });
        this.socket.on('close', () => {
            SocketClient.clients.delete(this.id);
            console.log(`Client ${this.id} disconnected`);
        });
    }

    public getId() {
        return this.id;
    }

    public getName() {
        return this.name;
    }

    public setName(name: string) {
        this.name = name;
    }

    public disconnect() {
        this.socket.close();
    }

    public sendMsg(msg: ServerMessage) {
        this.socket.send(JSON.stringify(msg.toJSON()));
    }
}