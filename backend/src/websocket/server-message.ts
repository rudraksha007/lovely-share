import type SocketClient from "./client.js";

export type ServerMessageType = "INIT_ACK" | "OFFER_ACK" | "ANSWER_ACK" | "ICE_ACK" | "CLOSE_ACK" | "GEN_ACK" | 'OFFER' | 'ANSWER' | 'ICE';
export type INIT_ACK_PAYLOAD = { success: boolean; id: string, message?: string };
export type OFFER_ACK_PAYLOAD = { success: boolean; message?: string };
export type ANSWER_ACK_PAYLOAD = { success: boolean; message?: string };
export type ICE_ACK_PAYLOAD = { success: boolean; message?: string };
export type CLOSE_ACK_PAYLOAD = { success: boolean; message?: string };
export type GEN_ACK_PAYLOAD = { success: boolean; message?: string };
export type OFFER_PAYLOAD = { fromId: string; offer: string; password: string };
export type ANSWER_PAYLOAD = { fromId: string; answer: string; password: string };
export type ICE_PAYLOAD = { fromId: string; iceCandidate: string };

export default class ServerMessage {
    private type: ServerMessageType;
    private data: any;

    constructor(type: ServerMessageType, data: any) {
        this.type = type;
        this.data = data;
    }

    public toJSON() {
        return {
            type: this.type,
            data: this.data
        }
    }
}

export class InitAckMessage extends ServerMessage {
    constructor(payload: INIT_ACK_PAYLOAD) {
        super("INIT_ACK", payload);
    }
}

export class OfferAckMessage extends ServerMessage {
    private target: string;
    constructor(target: string, payload: OFFER_ACK_PAYLOAD) {
        super("OFFER_ACK", payload);
        this.target = target;
    }
}

export class AnswerAckMessage extends ServerMessage {
    constructor(payload: ANSWER_ACK_PAYLOAD) {
        super("ANSWER_ACK", payload);
    }
}

export class CloseAckMessage extends ServerMessage {
    constructor(payload: CLOSE_ACK_PAYLOAD) {
        super("CLOSE_ACK", payload);
    }
}

export class OfferMessage extends ServerMessage {
    constructor(payload: OFFER_PAYLOAD) {
        super("OFFER", payload);
    }
}

export class AnswerMessage extends ServerMessage {
    constructor(payload: ANSWER_PAYLOAD) {
        super("ANSWER", payload);
    }
}

export class IceMessage extends ServerMessage {
    constructor(payload: ICE_PAYLOAD) {
        super("ICE", payload);
    }
}

export class IceAckMessage extends ServerMessage {
    constructor(payload: ICE_ACK_PAYLOAD) {
        super("ICE_ACK", payload);
    }
}