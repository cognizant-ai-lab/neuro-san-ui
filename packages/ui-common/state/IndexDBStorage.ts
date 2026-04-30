/**
 * IndexedDB storage adapter for Zustand persist middleware.
 *
 */

const DB_NAME = "zustand-store"
const OBJECT_STORE_NAME = "neuro-san-ui"

/**
 * StateStorage implementation using IndexedDB. Allows us to persist Zustand state in the browser's IndexedDB,
 * which is more robust and has larger storage limits than localStorage.
 */
/* eslint-disable unicorn/prefer-add-event-listener -- only applies to DOM event listeners which is not the case here */
export const idbStorage = {
    getItem: (itemName: string) =>
        new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1)
            request.onupgradeneeded = () => request.result.createObjectStore(OBJECT_STORE_NAME)
            request.onsuccess = () => {
                const tx = request.result.transaction(OBJECT_STORE_NAME, "readonly")
                const store = tx.objectStore(OBJECT_STORE_NAME)
                const get = store.get(itemName)
                get.onsuccess = () => resolve(get.result ?? null)
                get.onerror = () => reject(get.error)
            }
            request.onerror = () => reject(request.error)
        }),
    setItem: (itemName: string, value: unknown) =>
        new Promise<void>((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1)
            request.onupgradeneeded = () => request.result.createObjectStore(OBJECT_STORE_NAME)
            request.onsuccess = () => {
                const tx = request.result.transaction(OBJECT_STORE_NAME, "readwrite")
                const store = tx.objectStore(OBJECT_STORE_NAME)
                const put = store.put(value, itemName)
                put.onsuccess = () => resolve()
                put.onerror = () => reject(put.error)
            }
            request.onerror = () => reject(request.error)
        }),
    removeItem: (itemName: string) =>
        new Promise<void>((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1)
            request.onupgradeneeded = () => request.result.createObjectStore(OBJECT_STORE_NAME)
            request.onsuccess = () => {
                const tx = request.result.transaction(OBJECT_STORE_NAME, "readwrite")
                const store = tx.objectStore(OBJECT_STORE_NAME)
                const del = store.delete(itemName)
                del.onsuccess = () => resolve()
                del.onerror = () => reject(del.error)
            }
            request.onerror = () => reject(request.error)
        }),
}
/* eslint-enable unicorn/prefer-add-event-listener */
