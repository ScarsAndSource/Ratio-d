const DB_NAME = "plumbline";
const DB_VERSION = 1;
export const FACE_STORE = "faceScans";
export const BODY_STORE = "bodyScans";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FACE_STORE)) {
        db.createObjectStore(FACE_STORE, { keyPath: "id" }).createIndex("capturedAt", "capturedAt");
      }
      if (!db.objectStoreNames.contains(BODY_STORE)) {
        db.createObjectStore(BODY_STORE, { keyPath: "id" }).createIndex("capturedAt", "capturedAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function putRecord<T>(store: string, record: T): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllRecords<T>(store: string): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).index("capturedAt").getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}
