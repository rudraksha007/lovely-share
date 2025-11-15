import { IDBPDatabase, openDB } from "idb";

type Download = {
    id: string;
    name: string;
    size: number;
    committed: number;
    lastInd: number;
}
export type ItemData = Omit<Download, 'committed' | 'lastInd'>;

export class DownloadHandler {
    private downloads: Map<string, Download> = new Map();
    private currentFileId: string | null = null;
    private db: IDBPDatabase | null = null;
    private pendingChunks: Map<string, Array<ArrayBuffer>> = new Map();
    private progressCallback: (fileId: string, progress: number) => void;

    constructor(progressCallback: (fileId: string, progress: number) => void) {
        this.progressCallback = progressCallback;
        this.fileWriteLoop();
    }

    private async fileWriteLoop() {
        console.log("write loop started");
        this.db = await openDB('lovely-share-db', 1, {
            upgrade(db) {
                const store = db.createObjectStore('files', { keyPath: 'id' });
                store.createIndex('fileIndex', 'fileId', { unique: false });
            }
        });
        while (true) {
            if (this.pendingChunks.size === 0) {
                console.log("waiting for chunks to pile up");
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            else {
                for (const fileId of Array.from(this.pendingChunks.keys())) {
                    if (!fileId) continue;
                    const download = this.downloads.get(fileId);
                    if (!download) continue;
                    if (!this.pendingChunks.get(fileId) || this.pendingChunks.get(fileId)!.length === 0) continue;
                    while (this.pendingChunks.get(fileId)!.length > 0) {
                        const chunk = this.pendingChunks.get(fileId)!.shift();                        
                        if (!chunk) break;
                        download.committed += chunk.byteLength;
                        await this.db!.put('files', { id: `${fileId}:${download.lastInd}`, fileId: fileId, chunk: chunk, index: download.lastInd });
                        download.lastInd++;
                        if (download.lastInd % 100 === 0) this.progressCallback(fileId, (download.committed / download.size) * 100);
                    }
                    const done = download.size === download.committed;
                    this.progressCallback(fileId, (download.committed / download.size) * 100);
                    if (done) this.pendingChunks.delete(fileId);
                }
            }
            await new Promise(resolve => setTimeout(resolve, 20));
        }
    }

    public getProgress(fileId: string): number {
        const download = this.downloads.get(fileId);
        if (!download) return -1;
        return (download.committed / download.size) * 100;
    }

    public updateMeta(item: ItemData) {
        this.downloads.set(item.id, { ...item, committed: 0, lastInd: 0 });
        this.pendingChunks.set(item.id, []);        
    }

    public addPacket(ev: MessageEvent<ArrayBuffer | string>) {        
        if (ev.data instanceof ArrayBuffer) this.addChunk(ev.data);
        else if (typeof ev.data === "string") {
            const tag = JSON.parse(ev.data) as { type: string, data: ItemData };
            this.setCurrentFile(tag.data.id);            
            return;
        }
    }
    
    private setCurrentFile(fileId: string) {
        this.currentFileId = fileId;
    }
    
    private addChunk(chunk: ArrayBuffer) {
        if (!this.currentFileId) throw new Error("No current file set for download");
        const pending = this.pendingChunks.get(this.currentFileId);
        if (!pending) throw new Error("No pending chunks array for current file");
        pending.push(chunk);
    }
}