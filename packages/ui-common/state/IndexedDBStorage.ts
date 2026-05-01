/**
 * IndexedDB storage adapter for Zustand persist middleware.
 *
 */

export const DB_NAME = "zustand-store"
const OBJECT_STORE_NAME = "neuro-san-ui"

// Not exactly a sophisticated upgrade function, since it merely creates the object store if it doesn't exist.
// But good enough for our purposes for now.
const upgradeDB = (request: IDBOpenDBRequest) => () => {
    const db = request.result

    if (!db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
        return db.createObjectStore(OBJECT_STORE_NAME)
    }

    return undefined
}

/**
 * StateStorage implementation using IndexedDB. Allows us to persist Zustand state in the browser's IndexedDB,
 * which is more robust and has larger storage limits than localStorage.
 */
/* eslint-disable unicorn/prefer-add-event-listener -- only applies to DOM event listeners which is not the case here */
export const indexedDBStorage = {
    getItem: (itemName: string) =>
        new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME)
            request.onupgradeneeded = upgradeDB(request)
            request.onsuccess = () => {
                const db = request.result
                const tx = request.result.transaction(OBJECT_STORE_NAME, "readonly")
                const store = tx.objectStore(OBJECT_STORE_NAME)
                const get = store.get(itemName)
                get.onsuccess = () => resolve(get.result ?? null)
                get.onerror = () => reject(get.error)
                tx.oncomplete = () => db.close()
            }
            request.onerror = () => reject(request.error)
        }),
    setItem: (itemName: string, value: unknown) =>
        new Promise<void>((resolve, reject) => {
            const request = indexedDB.open(DB_NAME)
            request.onupgradeneeded = upgradeDB(request)
            request.onsuccess = () => {
                const db = request.result
                const tx = db.transaction(OBJECT_STORE_NAME, "readwrite")
                const store = tx.objectStore(OBJECT_STORE_NAME)
                const put = store.put(value, itemName)
                put.onsuccess = () => resolve()
                put.onerror = () => reject(put.error)
                tx.oncomplete = () => db.close()
            }
            request.onerror = () => reject(request.error)
        }),
    removeItem: (itemName: string) =>
        new Promise<void>((resolve, reject) => {
            const request = indexedDB.open(DB_NAME)
            request.onupgradeneeded = upgradeDB(request)
            request.onsuccess = () => {
                const db = request.result
                const tx = request.result.transaction(OBJECT_STORE_NAME, "readwrite")
                const store = tx.objectStore(OBJECT_STORE_NAME)
                const del = store.delete(itemName)
                del.onsuccess = () => resolve()
                del.onerror = () => reject(del.error)
                tx.oncomplete = () => db.close()
            }
            request.onerror = () => reject(request.error)
        }),
}
/* eslint-enable unicorn/prefer-add-event-listener */
