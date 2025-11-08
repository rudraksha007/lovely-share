import type WebSocket from "ws";

export type MessageType = "INIT" | "CLOSE" | "OFFER" | "ANSWER" | "ICE";

type MessagePayload = {
    type: MessageType;
    data: any;
}

export default class SocketMessage {
    private type: MessageType;
    private data: any;

    constructor(msg: WebSocket.RawData) {
        const parsed = JSON.parse(msg.toString()) as MessagePayload;
        this.type = parsed.type;
        this.data = parsed.data;
    }

    public getType(): MessageType {
        return this.type;
    }

    public getAsInit(): { userName: string } {
        return { userName: this.data.userName };
    }

    public getAsClose(): { reason?: string } {
        return { reason: this.data.reason };
    }

    public getAsOffer(): { targetId: string; offer: string; password: string } {
        return { targetId: this.data.targetId, offer: this.data.offer, password: this.data.password };
    }

    public getAsAnswer(): { targetId: string; answer: string; password: string } {
        return { targetId: this.data.targetId, answer: this.data.answer, password: this.data.password };
    }

    public getAsIce(): { targetId: string; iceCandidate: string } {
        return { targetId: this.data.targetId, iceCandidate: this.data.iceCandidate };
    }
}