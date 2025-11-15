'use client';
import Upload from "./Upload";
import { useEffect, useState } from "react";
import Preconnect from "./Preconnect";
import { SocketHandler } from "./socket-handle";
import { IceAckPayload } from "../../shared/types";


export enum ConnectionStatus {
  Idle = 1,
  Connecting = 2,
  Connected = 3,
  Failed = 4,
}

export type PeerConn = {
  pc: RTCPeerConnection | null;
  status: ConnectionStatus;
  pendingICE: any[];
  id: string;
  name: string;
  dc: {
    sender: RTCDataChannel | null;
    receiver: RTCDataChannel | null;
    metaSender: RTCDataChannel | null;
    metaReceiver: RTCDataChannel | null;
  }
}

export default function Page() {
  const [socket, setSocket] = useState<SocketHandler | null>(null);

  const [peerConn, setPeer] = useState<PeerConn>({ id: '', name: '', pc: null, status: ConnectionStatus.Idle, pendingICE: [], dc: { sender: null, receiver: null, metaSender: null, metaReceiver: null } });

  useEffect(() => {
    async function sendPendingICE() {
      if (socket) {
        if (peerConn.pendingICE.length > 0) {
          while (peerConn.pendingICE.length > 0) {
            const ice: any = peerConn.pendingICE.pop() as any;
            const res = (await socket.queueMsg({
              id: (Math.random() * 1000).toString(), type: 'ICE', data: {
                iceCandidate: ice
              }
            })).data as IceAckPayload;
            if (!res.success) {
              throw new Error("Unable to transmit ice to the server");
            }
          }
        }
      }
      if (socket && peerConn.pc) {
        peerConn.pc.onicecandidate = (ev) => {
          if (ev.candidate) {
            if (!socket) peerConn.pendingICE.push(ev.candidate);
            else {
              socket.queueMsg({
                id: (Math.random() * 1000).toString(), type: 'ICE', data: {
                  iceCandidate: ev.candidate
                }
              });
            }
          }
        };
      }
    }
    sendPendingICE();
  }, [socket, peerConn.pc]);

  useEffect(() => {
    console.log(`sender: ${peerConn.dc.sender}, metaSender: ${peerConn.dc.metaSender}`);
  }, [peerConn.dc.sender, peerConn.dc.metaSender]);

  const open = (name: string) => console.log(`channel: ${name} opened`);
  const close = (name: string) => console.log(`channel: ${name} closed`);
  const error = (name: string, ev: any) => console.log(`channel: ${name} error: ${ev.message}`);

  function handleInit(name: string, pass: string) {
    const pc = new RTCPeerConnection();
    const dc1 = pc.createDataChannel(`AB-datachannel`, { negotiated: true, id: 0 });
    const mc1 = pc.createDataChannel(`AB-metachannel`, { negotiated: true, id: 1 });
    const dc2 = pc.createDataChannel(`BA-datachannel`, { negotiated: true, id: 2 });
    const mc2 = pc.createDataChannel(`BA-metachannel`, { negotiated: true, id: 3 });
    dc1.onopen = () => open(dc1.label);
    dc1.onclose = () => close(dc1.label);
    dc1.onerror = (ev) => error(dc1.label, ev);
    mc1.onopen = () => open(mc1.label);
    mc1.onclose = () => close(mc1.label);
    mc1.onerror = (ev) => error(mc1.label, ev);
    dc2.onopen = () => open(dc2.label);
    dc2.onclose = () => close(dc2.label);
    dc2.onerror = (ev) => error(dc2.label, ev);
    mc2.onopen = () => open(mc2.label);
    mc2.onclose = () => close(mc2.label);
    mc2.onerror = (ev) => error(mc2.label, ev);

    setPeer((prev) => ({
      ...prev, pc, dc: {
        sender: dc1,
        metaSender: mc1,
        receiver: dc2,
        metaReceiver: mc2,
      }
    }));
    const newSocket = new SocketHandler(name, pass);
    setSocket(newSocket);
  }

  useEffect(() => {
    console.log("status changed to: " + peerConn.status);

  }, [peerConn.status])
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50">
      {peerConn.status < ConnectionStatus.Connected ? (
        <Preconnect onInit={handleInit} socket={socket} peerConn={peerConn} setPeer={setPeer} />
      ) : (
        <Upload peerConn={peerConn} />
      )}
    </div>
  );
}
