import type WebSocket from "ws";
import { generateUUID } from "../utils.js";
// import SocketMessage from "./message.js";
import type { ClientMessage, InitPayload, ServerMessage } from "../../../shared/types.js";

export enum ClientState {
    IDLE = "IDLE",
    CONNECTING = "CONNECTING",
    CONNECTED = "CONNECTED",
}

export default class SocketClient {
    static clients: Map<string, SocketClient> = new Map();
    private socket: WebSocket;
    private id: string;
    private peerId: string | null = null;
    private pass: string = "";
    private name: string = "Anonymous";
    private state: ClientState = ClientState.IDLE;
    private isPublic: boolean = false;

    constructor(socket: WebSocket, id?: string) {
        this.socket = socket;
        this.id = id || generateUUID();
        SocketClient.clients.set(this.id, this);
        this.hookEvents();
    }

    private hookEvents() {
        this.socket.on('message', (message) => {
            const msg = (JSON.parse(message.toString()) as ClientMessage); 
            switch (msg.type) {
                case 'INIT': {
                    const initData = msg.data;
                    this.name = initData.userName;
                    this.pass = initData.password;
                    console.log(`Client ${this.id} initialized with name ${this.name}`);
                    break;
                }
                case "PEERS_REQUEST": {
                    const peers = Array.from(SocketClient.clients.values())
                        .filter(client => client.getId() !== this.id && client.getVisibility())
                        .map(client => ({ id: client.getId(), name: client.getName() }));
                    this.sendMsg({ id: msg.id, type: "PEERS", data: { peers } });
                    break;
                }
                case 'VISIBILITY': {
                    this.isPublic = msg.data.visible;
                    this.sendMsg({ id: msg.id, type: "VISIBILITY_ACK", data: { visible: this.isPublic } });
                    break;
                }
                case 'OFFER': {
                    const offerData = msg.data;
                    const targetClient = SocketClient.clients.get(offerData.targetId);
                    if (!targetClient) {
                        this.sendMsg({ id: msg.id, type: "OFFER_ACK", data: { success: false, message: "Target client not found" } });
                        return;
                    }
                    if(targetClient.pass !== msg.data.password) {
                        this.sendMsg({ id: msg.id, type: 'OFFER_ACK', data: { success: false, message: "Password Invalid" } });
                        return;
                    }
                    this.setConnectionState(ClientState.CONNECTING, offerData.targetId);
                    targetClient.sendMsg({ type: "OFFER", data: { from: { id: this.id, name: this.name }, offer: offerData.offer } });
                    this.sendMsg({ id: msg.id, type: "OFFER_ACK", data: { success: true } });
                    break;
                }
                case 'ANSWER': {
                    const answerData = msg.data;
                    const targetClient = SocketClient.clients.get(answerData.targetId);
                    if (!targetClient) {
                        this.sendMsg({ id: msg.id, type: "ANSWER_ACK", data: { success: false, message: "Target client not found" } });
                        return;
                    }
                    this.setConnectionState(ClientState.CONNECTING, answerData.targetId);
                    targetClient.sendMsg({ type: "ANSWER", data: { fromId: this.id, answer: answerData.answer, password: answerData.password } });
                    this.sendMsg({ id: msg.id, type: "ANSWER_ACK", data: { success: true } });
                    break;
                }
                case 'ICE': {
                    const iceData = msg.data;
                    const targetClient = SocketClient.clients.get(iceData.targetId);
                    if (!targetClient) {
                        this.sendMsg({ id: msg.id, type: "ICE_ACK", data: { success: false, message: "Target client not found" } });
                        return;
                    }
                    targetClient.sendMsg({ type: "ICE", data: { fromId: this.id, iceCandidate: iceData.iceCandidate } });
                    this.sendMsg({ id: msg.id, type: "ICE_ACK", data: { success: true } });
                    this.setConnectionState(ClientState.CONNECTED, iceData.targetId);
                    targetClient.setConnectionState(ClientState.CONNECTED, this.id);
                    break;
                }
                case 'CLOSE': {
                    this.disconnect();
                    // if any peer was there, set all as idle
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

    public getVisibility() {
        return this.isPublic;
    }
    
    public setVisibility(visible: boolean) {
        this.isPublic = visible;
    }

    public disconnect() {
        this.socket.close();
    }

    public sendMsg(msg: ServerMessage) {
        this.socket.send(JSON.stringify(msg));
    }

    public setConnectionState(state: ClientState, peerId: string | null = null) {
        if (state >= ClientState.CONNECTING && !peerId && !this.peerId) {
            throw new Error("Peer ID must be provided when setting state to CONNECTING");
        }
        this.state = state;
        this.peerId = peerId ? peerId : this.peerId;
    }
}