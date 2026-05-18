import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = '4VillaLuz_Offline';
const DB_VERSION = 1;

export interface OfflineDB {
  animals: any[];
  masterData: {
    breeds: any[];
    species: any[];
    vaccines: any[];
    medications: any[];
  };
}

let dbPromise: Promise<IDBPDatabase> | null = null;

export const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('animals')) {
          db.createObjectStore('animals', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('masterData')) {
          db.createObjectStore('masterData');
        }
      },
    });
  }
  return dbPromise;
};

export const saveToOffline = async (storeName: string, data: any, key?: string) => {
  const db = await getDB();
  if (key) {
    await db.put(storeName, data, key);
  } else {
    await db.put(storeName, data);
  }
};

export const getFromOffline = async (storeName: string, key?: string) => {
  const db = await getDB();
  if (key) {
    return await db.get(storeName, key);
  }
  return await db.getAll(storeName);
};

export const clearOfflineStore = async (storeName: string) => {
  const db = await getDB();
  await db.clear(storeName);
};
