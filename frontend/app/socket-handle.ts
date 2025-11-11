import { ClientMessage, Peer, ServerMessage } from "../../shared/types";

export class SocketHandler {
    private socket: WebSocket;
    private name: string;
    private queue: Array<ClientMessage> = [];
    private password: string;
    private promises: Map<string, { resolve: (value: ServerMessage) => void; reject: (reason?: any) => void }> = new Map();
    //Events:
    // private onPeerCallback: ((peers: Peer[]) => void) | null = null;
    // private onVisibilityCallback: ((visible: boolean) => void) | null = null;
    private onIncomingOfferCallback: ((from: Peer, offer: string) => void) | null = null;

    constructor(name: string, pass: string) {
        const ws = new WebSocket("ws://10.176.83.151:3001");
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
            });
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
                    console.log("Received INIT_ACK:", msg.data);
                    break;
                }
                case "PEERS": {
                    const pending = this.promises.get(msg.id);
                    if(pending) pending.resolve(msg);
                    break;
                }
                case "VISIBILITY_ACK": {
                    const pending = this.promises.get(msg.id);
                    if (pending) pending.resolve(msg);
                    break;
                }
                case "OFFER": {
                    this.onIncomingOfferCallback && this.onIncomingOfferCallback({ id: msg.data.from.id, name: msg.data.from.name }, msg.data.offer);
                    break;
                }
                case "OFFER_ACK": {
                    const pending = this.promises.get(msg.id);
                    if (pending) {
                        pending.resolve(msg);
                    }
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

    // public onPeerReceived(callback: (peers: Peer[]) => void) {
    //     this.onPeerCallback = callback;
    // }

    // public onVisibilityChanged(callback: (visible: boolean) => void) {
    //     this.onVisibilityCallback = callback;
    // }

    public onIncomingOffer(callback: (from: Peer, offer: string) => void) {
        this.onIncomingOfferCallback = callback;
    }
}