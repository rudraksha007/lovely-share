import { ClientMessage, InitAckPayload, Peer, ServerMessage } from "../../shared/types";

export class SocketHandler {
    private socket: WebSocket;
    private id: string | null = null;
    private name: string;
    private queue: Array<ClientMessage> = [];
    private password: string;
    private promises: Map<string, { resolve: (value: ServerMessage) => void; reject: (reason?: any) => void }> = new Map();

    private onIncomingOfferCallback: ((from: Peer, offer: string, msgId: string) => void) | null = null;
    private onAnswerCallback: ((from: Peer, answer: string) => void) | null = null;
    private onIceCallback: ((from: { id: string }, iceCandidate: string) => void) | null = null;

    constructor(name: string, pass: string) {
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
        if (!wsUrl) throw new Error("WS url not specified in the env");
        const ws = new WebSocket(wsUrl);
        this.password = pass;
        this.socket = ws;
        this.name = name;
        this.setup();
    }

    async setup() {
        this.socket.onopen = () => {
            console.log("WebSocket connection established");
            this.queueMsg({
                id: (Math.random() * 10000).toString(),//(Math.random() * 10000).toString()
                type: 'INIT',
                data: {
                    userName: this.name,
                    password: this.password
                }
            }).then((msg) => {
                const data = msg.data as InitAckPayload;
                if (data.success) this.id = data.id;
                else {
                    throw new Error("Error occured while initializing");
                }
            })
            this.startMsgScheduler();
        };
        this.socket.onclose = () => {
            console.log("WebSocket connection closed");
        };
        this.socket.onerror = (error) => {
            console.error("WebSocket error:", error);
        };

        this.socket.onmessage = (event) => {
            const msg = JSON.parse(event.data) as ServerMessage;
            switch (msg.type) {
                case "INIT_ACK": {
                    break;
                }
                case "PEERS": {
                    const pending = this.promises.get(msg.id);
                    if (pending) pending.resolve(msg);
                    break;
                }
                case "VISIBILITY_ACK": {
                    const pending = this.promises.get(msg.id);
                    if (pending) pending.resolve(msg);
                    break;
                }
                case "OFFER": {
                    this.onIncomingOfferCallback && this.onIncomingOfferCallback({ id: msg.data.from.id, name: msg.data.from.name }, msg.data.offer, msg.id);
                    break;
                }
                case "OFFER_ACK": {
                    const pending = this.promises.get(msg.id);
                    if (pending) {
                        pending.resolve(msg);
                    }
                    break;
                }
                case 'ANSWER': {
                    if (this.onAnswerCallback) this.onAnswerCallback({ id: msg.data.from.id, name: msg.data.from.name }, msg.data.answer);
                    break;
                }
                case 'ICE': {
                    if (this.onIceCallback) this.onIceCallback({ id: msg.data.fromId }, msg.data.iceCandidate);
                    break;
                }
            }
        };
    }
    public queueMsg(msg: ClientMessage): Promise<ServerMessage> {
        const p = new Promise<ServerMessage>((resolve, reject) => {
            this.promises.set(msg.id, { resolve, reject });
        });
        this.queue.push(msg);
        return p;
    }
    private async startMsgScheduler() {
        while (true) {
            if (this.socket.readyState !== WebSocket.OPEN) break;
            if (this.queue.length == 0) await new Promise(resolve => setTimeout(resolve, 1000));
            const msg = this.queue.shift();
            if (msg) {
                this.socket.send(JSON.stringify(msg));
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    public getId() {
        return this.id;
    }

    public onIncomingOffer(callback: (from: Peer, offer: string, msgId: string) => void) {
        this.onIncomingOfferCallback = callback;
    }

    public onAnswer(callback: (from: Peer, answer: string) => void) {
        this.onAnswerCallback = callback;
    }

    public onIce(callback: (from: { id: string }, iceCandidate: any) => void) {
        this.onIceCallback = callback;
    }
}