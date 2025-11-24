import { HistoryRecord, NotebookEntry } from "../types";

const DB_NAME = "EchoBackDB";
const DB_VERSION = 1;
const STORE_HISTORY = "history";
const STORE_NOTEBOOK = "notebook";

export class EchoDB {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = this.openDB();
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_HISTORY)) {
          db.createObjectStore(STORE_HISTORY, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE_NOTEBOOK)) {
          db.createObjectStore(STORE_NOTEBOOK, { keyPath: "id" });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        console.error("IndexedDB open failed:", (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  // --- History Operations ---

  async saveHistory(record: HistoryRecord): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_HISTORY], "readwrite");
      const store = transaction.objectStore(STORE_HISTORY);
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveHistoryBatch(records: HistoryRecord[]): Promise<void> {
    if (records.length === 0) return;

    const db = await this.dbPromise;
    const transaction = db.transaction([STORE_HISTORY], "readwrite");
    const store = transaction.objectStore(STORE_HISTORY);

    // 使用 Promise.all 并行写入，提升性能
    await Promise.all(
      records.map(record => new Promise<void>((resolve, reject) => {
        const request = store.put(record);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }))
    );
  }

  async getHistory(): Promise<HistoryRecord[]> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_HISTORY], "readonly");
      const store = transaction.objectStore(STORE_HISTORY);
      const request = store.getAll();

      request.onsuccess = () => {
        // Sort by timestamp descending (newest first)
        const results = request.result as HistoryRecord[];
        results.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getHistoryPaged(offset: number, limit: number): Promise<HistoryRecord[]> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_HISTORY], "readonly");
      const store = transaction.objectStore(STORE_HISTORY);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result as HistoryRecord[];
        results.sort((a, b) => b.timestamp - a.timestamp);
        // 返回分页数据
        resolve(results.slice(offset, offset + limit));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getHistoryCount(): Promise<number> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_HISTORY], "readonly");
      const store = transaction.objectStore(STORE_HISTORY);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteHistory(id: string): Promise<void> {
     const db = await this.dbPromise;
     return new Promise((resolve, reject) => {
       const transaction = db.transaction([STORE_HISTORY], "readwrite");
       const store = transaction.objectStore(STORE_HISTORY);
       const request = store.delete(id);

       request.onsuccess = () => resolve();
       request.onerror = () => reject(request.error);
     });
   }

  // --- Notebook Operations ---

  async saveNotebookEntry(entry: NotebookEntry): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NOTEBOOK], "readwrite");
      const store = transaction.objectStore(STORE_NOTEBOOK);
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveNotebookBatch(entries: NotebookEntry[]): Promise<void> {
    if (entries.length === 0) return;

    const db = await this.dbPromise;
    const transaction = db.transaction([STORE_NOTEBOOK], "readwrite");
    const store = transaction.objectStore(STORE_NOTEBOOK);

    // 使用 Promise.all 并行写入，提升性能
    await Promise.all(
      entries.map(entry => new Promise<void>((resolve, reject) => {
        const request = store.put(entry);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }))
    );
  }

  async getNotebookEntries(): Promise<NotebookEntry[]> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NOTEBOOK], "readonly");
      const store = transaction.objectStore(STORE_NOTEBOOK);
      const request = store.getAll();

      request.onsuccess = () => {
         const results = request.result as NotebookEntry[];
         results.sort((a, b) => b.timestamp - a.timestamp);
         resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getNotebookPaged(offset: number, limit: number): Promise<NotebookEntry[]> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NOTEBOOK], "readonly");
      const store = transaction.objectStore(STORE_NOTEBOOK);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result as NotebookEntry[];
        results.sort((a, b) => b.timestamp - a.timestamp);
        // 返回分页数据
        resolve(results.slice(offset, offset + limit));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getNotebookCount(): Promise<number> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NOTEBOOK], "readonly");
      const store = transaction.objectStore(STORE_NOTEBOOK);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteNotebookEntry(id: string): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NOTEBOOK], "readwrite");
      const store = transaction.objectStore(STORE_NOTEBOOK);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const db = new EchoDB();