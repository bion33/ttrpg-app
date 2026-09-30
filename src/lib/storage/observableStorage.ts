import {createJSONStorage} from 'jotai/utils'

// The synchronous jotai storage shape, derived from createJSONStorage since jotai does not re-export the type.
type NotifyingStorage<Value> = ReturnType<typeof createJSONStorage<Value>>

// Listeners fired after any persisted atom writes, so dirty state can recompute on edits, not only on window focus.
const listeners = new Set<() => void>()

// Notifies every subscriber that a persisted value just changed.
function notifyStorageWrite(): void {
    for (const listener of listeners) listener()
}

/**
 * A jotai storage backed by localStorage that notifies subscribers after each write; otherwise identical to the default
 * JSON storage. Every persisted atom uses it so a field edit triggers a dirty re-check immediately.
 */
export function notifyingStorage<Value>(): NotifyingStorage<Value> {
    const base = createJSONStorage<Value>(() => localStorage)
    return {
        ...base,
        setItem(key, value) {
            base.setItem(key, value)
            notifyStorageWrite()
        },
        removeItem(key) {
            base.removeItem(key)
            notifyStorageWrite()
        },
    }
}

/**
 * Subscribes to persisted-atom writes; returns an unsubscribe. The storage hook uses it to recompute dirty on edits.
 */
export function subscribeToStorageWrites(listener: () => void): () => void {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}
