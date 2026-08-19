const DB_NAME = 'Webjr';
const DB_VERSION = 1;
const STORES = ['projects', 'usershapes', 'userbkgs', 'userfiles', 'test', 'recordings'];

let dbPromise = null;

function openDatabase () {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            STORES.forEach(name => {
                if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
            });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    return dbPromise;
}

function transaction (storeName, mode, action) {
    return openDatabase().then(db => new Promise((resolve, reject) => {
        let settled = false;
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        tx.onerror = () => {
            if (!settled) {
                settled = true;
                reject(tx.error);
            }
        };
        tx.onabort = () => {
            if (!settled) {
                settled = true;
                reject(tx.error);
            }
        };
        action(store, value => {
            if (!settled) {
                settled = true;
                resolve(value);
            }
        }, err => {
            if (!settled) {
                settled = true;
                reject(err);
            }
        });
    }));
}

export default class WebStore {
    static get (storeName, key) {
        return transaction(storeName, 'readonly', (store, resolve, reject) => {
            const req = store.get(String(key));
            req.onsuccess = () => resolve(req.result == null ? null : req.result);
            req.onerror = () => reject(req.error);
        });
    }

    static set (storeName, key, value) {
        return transaction(storeName, 'readwrite', (store, resolve, reject) => {
            const req = store.put(value, String(key));
            req.onsuccess = () => resolve(value);
            req.onerror = () => reject(req.error);
        });
    }

    static remove (storeName, key) {
        return transaction(storeName, 'readwrite', (store, resolve, reject) => {
            const req = store.delete(String(key));
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
        });
    }

    static clear (storeName) {
        return transaction(storeName, 'readwrite', (store, resolve, reject) => {
            const req = store.clear();
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
        });
    }

    static all (storeName) {
        return transaction(storeName, 'readonly', (store, resolve, reject) => {
            const result = [];
            const req = store.openCursor();
            req.onsuccess = event => {
                const cursor = event.target.result;
                if (!cursor) {
                    resolve(result);
                    return;
                }
                result.push(cursor.value);
                cursor.continue();
            };
            req.onerror = () => reject(req.error);
        });
    }
}
