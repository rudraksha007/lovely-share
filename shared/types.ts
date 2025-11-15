// Client-to-Server Message Types
export type MessageType = "INIT" | "CLOSE" | "OFFER" | "ANSWER" | "ICE" | "VISIBILITY" | "PEERS_REQUEST";
export type Peer = {
    id: string;
    name: string;
}

// Client-to-Server Message Payloads
export type InitPayload = {
    userName: string;
    password: string;
};

export type ClosePayload = {
    reason?: string;
};

export type OfferPayload = {
    targetId: string;
    offer: string;
    password: string;
};

export type AnswerPayload = {
    targetId: string;
    accepted: boolean;
    answer: string;
};

export type IcePayload = {
    iceCandidate: any;
};

export type VisibilityPayload = {
    visible: boolean;
};

// Generic Client Message Structure
export type ClientMessage = 
    | { id: string, type: "INIT"; data: InitPayload }
    | { id: string, type: "CLOSE"; data: ClosePayload }
    | { id: string, type: "OFFER"; data: OfferPayload }
    | { id: string, type: "ANSWER"; data: AnswerPayload }
    | { id: string, type: "ICE"; data: IcePayload }
    | { id: string, type: "VISIBILITY"; data: VisibilityPayload }
    | { id: string, type: "PEERS_REQUEST"; data: null };

// Server-to-Client Message Types
export type ServerMessageType = "INIT_ACK" | "OFFER_ACK" | "ANSWER_ACK" | "ICE_ACK" | "CLOSE_ACK" | "GEN_ACK" | "OFFER" | "ANSWER" | "ICE" | "PEERS" | "VISIBILITY_ACK";

// Server-to-Client Message Payloads
export type InitAckPayload = {
    success: boolean;
    id: string;
    message?: string;
};

export type OfferAckPayload = {
    success: boolean;
    message?: string;
};

export type AnswerAckPayload = {
    success: boolean;
    message?: string;
};

export type IceAckPayload = {
    success: boolean;
    message?: string;
};

export type CloseAckPayload = {
    success: boolean;
    message?: string;
};

export type GenAckPayload = {
    success: boolean;
    message?: string;
};

export type ServerOfferPayload = {
    from: Peer;
    offer: string;
};

export type ServerAnswerPayload = {
    from: Peer;
    accepted: boolean;
    answer: string;
};

export type ServerIcePayload = {
    fromId: string;
    iceCandidate: any;
};

export type PeersPayload = {
    peers: Peer[];
};

export type VisibilityAckPayload = {
    visible: boolean;
};

// Generic Server Message Structure
export type ServerMessage = 
    | { id: string, type: "INIT_ACK"; data: InitAckPayload }
    | { id: string, type: "OFFER_ACK"; data: OfferAckPayload }
    | { id: string, type: "ANSWER_ACK"; data: AnswerAckPayload }
    | { id: string, type: "ICE_ACK"; data: IceAckPayload }
    | { id: string, type: "CLOSE_ACK"; data: CloseAckPayload }
    | { id: string, type: "GEN_ACK"; data: GenAckPayload }
    | { id: string, type: "OFFER"; data: ServerOfferPayload }
    | { id: string, type: "ANSWER"; data: ServerAnswerPayload }
    | { type: "ICE"; data: ServerIcePayload }
    | { id: string, type: "PEERS"; data: PeersPayload }
    | { id: string, type: "VISIBILITY_ACK"; data: VisibilityAckPayload }
