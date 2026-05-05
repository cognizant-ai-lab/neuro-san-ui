// Include mock for IndexedDB
import "fake-indexeddb/auto"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {DB_NAME, indexedDBStorage} from "../../../state/IndexedDBStorage"

// Open the DB with a higher version number to trigger the onupgradeneeded event
/* eslint-disable unicorn/prefer-add-event-listener */
const openDBForUpgrade = async () => {
    await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 2)
        request.onsuccess = () => {
            request.result.close()
            resolve()
        }
        request.onerror = () => {
            reject(request.error)
        }
    })
}
/* eslint-enable unicorn/prefer-add-event-listener */

describe("idbStorage", () => {
    withStrictMocks()
    it("Sets and gets items in the store", async () => {
        const testItem = {foo: "bar"}
        const testKey = "testKey"
        await indexedDBStorage.setItem(testKey, testItem)
        const value = await indexedDBStorage.getItem(testKey)
        expect(value).toEqual(testItem)
    })

    it("Removes items from the store", async () => {
        const testItem = {foo: "bar"}
        const testKey = "testKey"
        await indexedDBStorage.setItem(testKey, testItem)
        await indexedDBStorage.removeItem(testKey)
        const value = await indexedDBStorage.getItem(testKey)
        expect(value).toBeNull()
    })

    it("Handles upgrade events", async () => {
        const testItem = {foo: "bar"}
        const testKey = "testKey"

        // put an item in the database to ensure the object store is created
        await indexedDBStorage.setItem(testKey, testItem)

        // Open the DB with a higher version number to trigger the onupgradeneeded event
        await openDBForUpgrade()

        // Now perform read operation
        const value = await indexedDBStorage.getItem(testKey)
        expect(value).toEqual(testItem)
    })

    it("rejects when open fails", async () => {
        const fakeRequest = {error: new DOMException("open failed")} as IDBOpenDBRequest
        globalThis.indexedDB = {
            open: () => {
                setTimeout(() => fakeRequest.onerror(new Event("error")), 0)
                return fakeRequest
            },
        } as unknown as IDBFactory

        await expect(indexedDBStorage.getItem("key")).rejects.toBeDefined()
        await expect(indexedDBStorage.setItem("key", "value")).rejects.toBeDefined()
        await expect(indexedDBStorage.removeItem("key")).rejects.toBeDefined()
    })

    it("Errors out when CRUD operations fail", async () => {
        const fakeOpRequest = {error: new DOMException("get failed")} as IDBRequest
        const fakeStore = {
            get: () => {
                setTimeout(() => fakeOpRequest.onerror(new Event("error")), 0)
                return fakeOpRequest
            },
            put: () => {
                setTimeout(() => fakeOpRequest.onerror(new Event("error")), 0)
                return fakeOpRequest
            },
            delete: () => {
                setTimeout(() => fakeOpRequest.onerror(new Event("error")), 0)
                return fakeOpRequest
            },
        } as unknown as IDBObjectStore
        const fakeTx = {objectStore: () => fakeStore, oncomplete: null} as unknown as IDBTransaction
        const fakeDB = {transaction: () => fakeTx, close: jest.fn()} as unknown as IDBDatabase
        const fakeRequest = {result: fakeDB} as IDBOpenDBRequest
        globalThis.indexedDB = {
            open: () => {
                setTimeout(() => {
                    fakeRequest.onsuccess(new Event("success"))
                }, 0)
                return fakeRequest
            },
        } as unknown as IDBFactory

        await expect(indexedDBStorage.getItem("key")).rejects.toBeDefined()
        await expect(indexedDBStorage.setItem("key", "value")).rejects.toBeDefined()
        await expect(indexedDBStorage.removeItem("key")).rejects.toBeDefined()
    })
})
