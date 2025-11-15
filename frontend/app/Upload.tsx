"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PeerConn } from "./page";
import { IDBPDatabase, openDB } from 'idb';
import { makeUUID } from "@/lib/utils";
import { DownloadHandler, ItemData } from "./download";

declare global {
  interface Window {
    showSaveFilePicker(options?: {
      suggestedName?: string;
    }): Promise<FileSystemFileHandle>;
  }
}

type UploadFile = { id: string; name: string; file: File; progress: number };
type IncomingFile = { id: string; name: string; size: number; progress: number };

export default function Upload({ peerConn }: { peerConn: PeerConn }) {
  const [queue, setQueue] = useState<UploadFile[]>([]);
  const [uploads, setUploads] = useState<{ [key: string]: UploadFile }>({});
  const [message, setMessage] = useState("");
  const [incomingDownloads, setIncomingDownloads] = useState<{ [key: string]: IncomingFile }>({});
  function updateProgress(fileId: string, progress: number) {
    console.log(`file: ${fileId}, progress: ${progress}`);
    
    setIncomingDownloads((prev) => {
      const file = prev[fileId];
      if (!file) return prev;
      return {
        ...prev,
        [fileId]: {
          ...file,
          progress,
        }
      };
    });
  }

  const downloadHandler = useRef<DownloadHandler | null>(null);

  // Incoming files from other person
  const downloadsRef = useRef(incomingDownloads);
  useEffect(() => {
    downloadsRef.current = incomingDownloads;
  }, [incomingDownloads]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  useEffect(() => {
    if (downloadHandler.current) return;
    downloadHandler.current = new DownloadHandler(updateProgress);
  }, []);

  useEffect(() => {
    if (peerConn.dc.receiver) {
      peerConn.dc.receiver.onmessage = (ev)=> downloadHandler.current?.addPacket(ev);
    }
  }, [peerConn.dc.receiver]);

  useEffect(() => {
    if (peerConn.dc.metaReceiver) {
      peerConn.dc.metaReceiver.onmessage = async (ev) => {
        const msg = JSON.parse(ev.data) as { type: string; data: ItemData };
        if (msg.type !== "file-meta") throw new Error("Invalid msg recieved from peer");
        else {
          setIncomingDownloads((prev) => ({ ...prev, [msg.data.id]: { id: msg.data.id, name: msg.data.name, size: msg.data.size, progress: 0, sizeInDB: 0, lastInd: 0, done: false } }));
          downloadHandler.current?.updateMeta(msg.data);
        }
      }
    }
  }, [peerConn.dc.metaReceiver]);

  async function exportFile(fileId: string, fileName: string) {
    const fh = await window.showSaveFilePicker({
      suggestedName: fileName
    });
    const writable = await fh.createWritable();

    const db = await openDB('lovely-share-db', 1);
    const index = db.transaction('files', 'readonly').objectStore('files').index('fileIndex');
    let records = await index.getAll(fileId);
    records.sort((a, b) => a.index - b.index);

    for (const rec of records) {
      await writable.write(rec.chunk);
    }

    await writable.close();
  }

  // FILE UPLOAD
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files).map((f) => ({
      id: Math.random().toString(36),
      name: f.name,
      file: f,
      progress: 0,
      type: "file" as const,
    }));

    setQueue((q) => [...q, ...newFiles]);
    e.target.value = "";
  };

  const startUpload = useCallback(async () => {
    if (queue.length === 0) return;

    const items = queue;
    setUploads(u => ({
      ...u,
      ...Object.fromEntries(items.map(item => [item.id, item]))
    }));
    setQueue([]);
    setMessage("Uploading...");

    const MAX_SLICE = 16 * 1024; // 16KB safe everywhere

    async function sendChunk(dc: RTCDataChannel, chunk: ArrayBuffer) {
      // prevent send-queue overflow
      while (dc.bufferedAmount > 1_000_000) {
        await new Promise(res => setTimeout(res, 2));
      }
      dc.send(chunk);
    }

    // -----------------------------
    // 1. Send metadata for all items
    // -----------------------------
    const infos: ItemData[] = [];
    for (const item of items) {
      const metaDc = peerConn.dc.metaSender;
      if (!metaDc) continue;

      while (metaDc.readyState !== "open") {
        await new Promise(res => setTimeout(res, 200));
      }

      const info: ItemData = {
        id: makeUUID(),
        name: item.file.name,
        size: item.file.size,
      };
      infos.push(info);

      metaDc.send(JSON.stringify({ type: "file-meta", data: info }));
    }

    // -----------------------------
    // 2. Send file data
    // -----------------------------
    var i = 0;
    for (const item of items) {
      const dataDc = peerConn.dc.sender;
      if (!dataDc) continue;

      while (dataDc.readyState !== "open") {
        await new Promise(res => setTimeout(res, 200));
      }

      // meta separator before file data

      console.log("sending meta");
      dataDc.send(JSON.stringify({ type: "file-meta", data: infos[i] }));

      // -------- Manual slicing HERE --------
      const file = item.file;
      const totalSize = file.size;
      let offset = 0;
      let sent = 0;
      let chunkCounter = 0;

      while (offset < totalSize) {
        const end = Math.min(offset + MAX_SLICE, totalSize);
        const blobSlice = file.slice(offset, end);
        const arrayBuffer = await blobSlice.arrayBuffer();
        const chunk = new Uint8Array(arrayBuffer);
        if (dataDc.readyState !== "open") {
          console.log("Channel closed during upload");
          break;
        }

        await sendChunk(dataDc, chunk.buffer);

        offset = end;
        sent += chunk.length;
        chunkCounter++;

        // Update progress every few chunks
        if (chunkCounter % 40 === 0) {
          setUploads(prev => ({
            ...prev,
            [item.id]: {
              ...prev[item.id],
              progress: (sent * 100) / totalSize
            }
          }));
        }
      }

      // Final update
      setUploads(prev => ({
        ...prev,
        [item.id]: { ...prev[item.id], progress: 100 }
      }));
      i++;
    }

  }, [peerConn, setUploads, queue]);


  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4 lg:p-6">
        <div className="w-full max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* LEFT: INCOMING FILES FROM OTHER PERSON */}
            <div className="w-full">
              <div className="bg-white rounded-3xl shadow-2xl p-6 space-y-5 transform transition-all duration-300 hover:shadow-3xl h-full flex flex-col min-h-[560px]">
                {/* Header */}
                <div className="text-center space-y-2.5">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-linear-to-br from-green-500 to-emerald-600 shadow-lg mx-auto">
                    <svg
                      className="w-8 h-8 text-white"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 11l3 3m0 0l3-3m-3 3V4" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold bg-linear-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    Incoming Files
                  </h2>
                  <p className="text-gray-600 text-base">
                    Files from <span className="font-semibold text-emerald-600">{peerConn.name}</span>
                  </p>
                </div>

                {/* Incoming Files List */}
                <div className="flex-1 bg-gray-50 rounded-xl p-5 overflow-y-auto border border-gray-100">
                  {Object.keys(incomingDownloads).length === 0 ? (
                    <div className="text-center py-8">
                      <svg
                        className="w-14 h-14 mx-auto text-gray-300 mb-3"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-gray-500">No incoming files</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Downloading files */}
                      {Object.values(incomingDownloads).map((file) => {
                        return (
                          <div key={file.id} className="bg-white p-4 rounded-xl shadow-sm">
                            <p className="font-semibold text-gray-900 mb-2 truncate text-sm flex items-center gap-2">
                              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                              </svg>
                              {file.name}
                            </p>
                            <div className="bg-gray-200 rounded-full h-3.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${file.progress === 100 && file.progress >= 100
                                  ? 'bg-linear-to-r from-emerald-500 to-green-600'
                                  : 'bg-linear-to-r from-green-600 to-emerald-600'
                                  }`}
                                style={{ width: `${file.progress}%` }}
                              />
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <span className={`text-xs font-semibold ${file.progress === 100 ? 'text-emerald-600' : 'text-gray-600'}`}>
                                {file.progress === 100 ? 'Ready' : `Downloading... ${file.progress.toFixed(2)}%`}
                              </span>
                              {file.progress === 100 && file.progress >= 100 && (
                                <button
                                  onClick={() => exportFile(file.id, file.name)}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-linear-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-700 hover:to-green-700 transition-all shadow-sm hover:shadow"
                                  title="Save a copy to your device"
                                >
                                  Download
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Info Section */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-xl">
                    <svg
                      className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="text-sm text-emerald-900">
                      <p className="font-semibold mb-1">Incoming Files</p>
                      <p className="text-emerald-700">
                        Click on any incoming file to review and accept or decline the transfer.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: YOUR UPLOADS */}
            <div className="w-full">
              <div className="bg-white rounded-3xl shadow-2xl p-6 space-y-5 transform transition-all duration-300 hover:shadow-3xl h-full flex flex-col min-h-[560px]">
                {/* Header */}
                <div className="text-center space-y-2.5">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-linear-to-br from-purple-500 to-indigo-600 shadow-lg mx-auto">
                    <svg
                      className="w-8 h-8 text-white"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold bg-linear-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    Your Uploads
                  </h2>
                  <p className="text-gray-600 text-base">
                    Select files or folders to share
                  </p>
                </div>

                {/* Upload Buttons */}
                <div className="flex gap-3 justify-center">
                  <label className="px-6 py-3 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95">
                    Select Files
                    <input type="file" multiple onChange={handleFileSelect} className="hidden" />
                  </label>
                </div>

                {/* Queued Items */}
                {queue.length > 0 && (
                  <div className="bg-indigo-50 border-2 border-dashed border-indigo-300 rounded-xl p-4 max-h-60 overflow-y-auto">
                    <p className="mb-3 font-semibold text-indigo-700">
                      {queue.length} item{queue.length > 1 ? "s" : ""} queued
                    </p>

                    <div className="space-y-2">
                      {queue.map((item) => (
                        <div
                          key={item.id}
                          className='flex items-center justify-between p-2.5 rounded-lg bg-indigo-100'
                        >
                          <span className="font-medium text-gray-900 text-sm truncate flex-1 flex items-center gap-2">
                            <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                            {item.name}
                          </span>
                          <span className="text-gray-600 font-semibold text-xs ml-2">
                            {formatSize(item.file.size)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload Progress */}
                {Object.keys(uploads).length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4 max-h-48 overflow-y-auto border border-gray-100">
                    <p className="mb-3 font-semibold text-gray-700">Upload Progress</p>
                    <div className="space-y-3">
                      {Object.values(uploads).map((file) => (
                        <div key={file.id} className="bg-white p-3 rounded-lg shadow-sm">
                          <p className="font-semibold text-gray-900 mb-2 truncate text-sm flex items-center gap-2">
                            <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                            {file.name}
                          </p>
                          <div className="bg-gray-200 rounded-full h-3.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${file.progress === 100
                                ? 'bg-linear-to-r from-green-500 to-green-600'
                                : 'bg-linear-to-r from-purple-600 to-indigo-600'
                                }`}
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold mt-1 block ${file.progress === 100 ? 'text-green-600' : 'text-gray-600'
                            }`}>
                            {file.progress}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload Button */}
                <button
                  onClick={startUpload}
                  disabled={queue.length === 0}
                  className={`w-full py-3.5 rounded-xl font-bold text-base shadow-lg transition-all duration-200 ${queue.length > 0
                    ? 'bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-gray-300 cursor-not-allowed text-gray-500'
                    }`}
                >
                  {queue.length > 0
                    ? `Upload ${queue.length} Item${queue.length > 1 ? "s" : ""}`
                    : "No Items to Upload"}
                </button>

                {/* Status Message */}
                {message && (
                  <div className={`text-center p-3 rounded-xl font-semibold ${message.includes("completed")
                    ? 'bg-green-50 text-green-700'
                    : 'bg-indigo-50 text-indigo-700'
                    }`}>
                    {message}
                  </div>
                )}

                {/* Info Section */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-xl">
                    <svg
                      className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="text-sm text-indigo-900">
                      <p className="font-semibold mb-1">Quick tip</p>
                      <p className="text-indigo-700">
                        Select multiple files or entire folders to queue them for upload. Track progress in real-time.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <p className="text-center text-gray-500 text-sm mt-6">
            Secure • Fast • Private
          </p>
        </div>
      </div>
    </>
  );
}