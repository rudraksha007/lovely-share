'use client';
import Upload from "@/components/Upload";
import { useEffect, useState } from "react";
import Preconnect from "./Preconnect";
import { SocketHandler } from "./socket-handle";

export type Partner = {
  id: string;
  name: string;
}

export default function Page() {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [socket, setSocket] = useState<SocketHandler | null>(null);
  function handleInit(name: string, pass: string) {
    const newSocket = new SocketHandler(name, pass);
    setSocket(newSocket);
  }
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50">
      {partner === null ? (
        <Preconnect onConnect={setPartner} onInit={handleInit} socket={socket} />
      ) : (
        <Upload />
      )}
    </div>
  );
}
