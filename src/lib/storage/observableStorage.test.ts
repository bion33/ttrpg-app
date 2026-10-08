import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {notifyingStorage, subscribeToDataWrites, subscribeToStorageWrites} from './observableStorage.ts'

// A minimal in-memory Storage so createJSONStorage has a localStorage to back onto in the node test environment.
function installLocalStorage() {
    const map = new Map<string, string>()
    const storage = {
        getItem: (key: string) => map.get(key) ?? null,
        setItem: (key: string, value: string) => void map.set(key, value),
        removeItem: (key: string) => void map.delete(key),
        clear: () => map.clear(),
        key: () => null,
        length: 0,
    }
    vi.stubGlobal('localStorage', storage)
}

describe('notifyingStorage', () => {
    beforeEach(installLocalStorage)
    afterEach(() => vi.unstubAllGlobals())

    it('notifies subscribers on write and delete, but not on read', () => {
        const listener = vi.fn()
        subscribeToStorageWrites(listener)
        const storage = notifyingStorage<number>()

        storage.setItem('a', 1)
        expect(listener).toHaveBeenCalledTimes(1)

        storage.getItem('a', 0)
        expect(listener).toHaveBeenCalledTimes(1)

        storage.removeItem('a')
        expect(listener).toHaveBeenCalledTimes(2)
    })

    it('still persists the value through to the underlying storage', () => {
        const storage = notifyingStorage<number>()
        storage.setItem('count', 7)
        expect(storage.getItem('count', 0)).toBe(7)
    })

    it('stops notifying once unsubscribed', () => {
        const listener = vi.fn()
        const unsubscribe = subscribeToStorageWrites(listener)
        unsubscribe()

        notifyingStorage<number>().setItem('a', 1)
        expect(listener).not.toHaveBeenCalled()
    })
})

describe('subscribeToDataWrites', () => {
    beforeEach(installLocalStorage)
    afterEach(() => vi.unstubAllGlobals())

    it('notifies on a data-key write but ignores per-device view-key writes', () => {
        const listener = vi.fn()
        subscribeToDataWrites(listener)
        const storage = notifyingStorage<number>()

        storage.setItem('location', 1)
        storage.setItem('pageWidthFraction', 1)
        expect(listener).not.toHaveBeenCalled()

        storage.setItem('binders', 1)
        expect(listener).toHaveBeenCalledTimes(1)

        storage.removeItem('location')
        expect(listener).toHaveBeenCalledTimes(1)
    })
})
