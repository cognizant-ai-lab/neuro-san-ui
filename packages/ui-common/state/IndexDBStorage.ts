/**
 * IndexedDB storage adapter for Zustand persist middleware.
 *
 */

/* Copilot explanation of why it's okay to disable the Unicorn rule here:
The linter rule unicorn/prefer-add-event-listener is designed for DOM elements like window or HTMLElement,
where there's a meaningful difference between onerror and addEventListener('error').
However, IDBRequest, IDBOpenDBRequest, etc. are not DOM event targets in the same sense —
they're IndexedDB request objects. The unicorn rule is overly broad here and is flagging a false positive.
 */
/* eslint-disable unicorn/prefer-add-event-listener */
import {StateStorage} from "zustand/middleware"

const DB_NAME = "zustand-store"
const OBJECT_STORE_NAME = "neuro-san-ui"

export const idbStorage: StateStorage = {
    getItem: (itemName) =>
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
    setItem: (itemName, value) =>
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
    removeItem: (itemName) =>
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
