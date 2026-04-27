/**
 * IndexedDB storage adapter for Zustand persist middleware.
 *
 * Structure:
 * <pre>
 * IndexedDB database: "zustand-store"
 *   └── object store: "kv"
 *         └── key: "agent-chat-history"
 *                 └── value: serialized Map<string, AgentChatHistory>
 *                       └── key: agentId (string)
 *                       └── value: { chatHistory, chatContext}
 * </pre>
 */
/* Copilot explanation of why it's okay to disable the Unicorn rule here:
The linter rule unicorn/prefer-add-event-listener is designed for DOM elements like window or HTMLElement,
where there's a meaningful difference between onerror and addEventListener('error').
However, IDBRequest, IDBOpenDBRequest, etc. are not DOM event targets in the same sense —
they're IndexedDB request objects. The unicorn rule is overly broad here and is flagging a false positive.
 */
/* eslint-disable unicorn/prefer-add-event-listener */
import {StateStorage} from "zustand/middleware"

export const idbStorage: StateStorage = {
    getItem: (itemName) =>
        new Promise((resolve, reject) => {
            const request = indexedDB.open("zustand-store", 1)
            request.onupgradeneeded = () => request.result.createObjectStore("kv")
            request.onsuccess = () => {
                const tx = request.result.transaction("kv", "readonly")
                const store = tx.objectStore("kv")
                const get = store.get(itemName)
                get.onsuccess = () => resolve(get.result ?? null)
                get.onerror = () => reject(get.error)
            }
            request.onerror = () => reject(request.error)
        }),
    setItem: (itemName, value) =>
        new Promise<void>((resolve, reject) => {
            const request = indexedDB.open("zustand-store", 1)
            request.onupgradeneeded = () => request.result.createObjectStore("kv")
            request.onsuccess = () => {
                const tx = request.result.transaction("kv", "readwrite")
                const store = tx.objectStore("kv")
                const put = store.put(value, itemName)
                put.onsuccess = () => resolve()
                put.onerror = () => reject(put.error)
            }
            request.onerror = () => reject(request.error)
        }),
    removeItem: (itemName) =>
        new Promise<void>((resolve, reject) => {
            const request = indexedDB.open("zustand-store", 1)
            request.onupgradeneeded = () => request.result.createObjectStore("kv")
            request.onsuccess = () => {
                const tx = request.result.transaction("kv", "readwrite")
                const store = tx.objectStore("kv")
                const del = store.delete(itemName)
                del.onsuccess = () => resolve()
                del.onerror = () => reject(del.error)
            }
            request.onerror = () => reject(request.error)
        }),
}
/* eslint-enable unicorn/prefer-add-event-listener */
