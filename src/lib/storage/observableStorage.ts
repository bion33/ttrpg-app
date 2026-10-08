import {createJSONStorage} from 'jotai/utils'
import {SYNC_IGNORE_KEYS} from './snapshot.ts'

// The synchronous jotai storage shape, derived from createJSONStorage since jotai does not re-export the type.
type NotifyingStorage<Value> = ReturnType<typeof createJSONStorage<Value>>

// Listeners fired after any persisted atom writes, so dirty state can recompute on edits, not only on window focus. Each
// receives the written key, or undefined for a bulk change that touches many keys at once.
const listeners = new Set<(key?: string) => void>()

// Notifies every subscriber that a persisted value just changed, naming the key (undefined for a bulk change).
function notifyStorageWrite(key?: string): void {
    for (const listener of listeners) listener(key)
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
            notifyStorageWrite(key)
        },
        removeItem(key) {
            base.removeItem(key)
            notifyStorageWrite(key)
        },
    }
}

/**
 * Removes every localStorage entry whose key starts with the given prefix, then notifies subscribers once. Used to
 * purge a whole namespace (e.g. a deleted binder and all its pages) rather than one atom at a time.
 */
export function removeStorageByPrefix(prefix: string): void {
    const keys = []
    for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index)
        if (key !== null && key.startsWith(prefix)) keys.push(key)
    }
    for (const key of keys) localStorage.removeItem(key)
    notifyStorageWrite()
}

/**
 * Subscribes to persisted-atom writes; returns an unsubscribe. The storage hook uses it to recompute dirty on edits.
 */
export function subscribeToStorageWrites(listener: (key?: string) => void): () => void {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

/**
 * Subscribes to writes that change the synced snapshot, ignoring per-device view-key writes (an open-tab or zoom
 * change is not an edit and must never drive dirty detection or autosave); returns an unsubscribe.
 */
export function subscribeToDataWrites(listener: () => void): () => void {
    return subscribeToStorageWrites((key) => {
        if (key !== undefined && SYNC_IGNORE_KEYS.has(key)) return
        listener()
    })
}
