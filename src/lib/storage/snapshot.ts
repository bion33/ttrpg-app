import hashSum from 'hash-sum'
import {CURRENT_VERSION, migrateSnapshot} from '../../migrations/migrations.ts'

/**
 * A whole-library snapshot: every localStorage entry plus the version it conforms to, a revision GUID identifying this
 * exact saved state, and a display-only save timestamp.
 */
export interface LibrarySnapshot {
    version: number
    revision: string
    savedAt: string
    entries: Record<string, string>
}

/**
 * The subset of the Storage API the snapshot layer uses; window.localStorage satisfies it, and tests inject a fake.
 */
export interface StorageLike {
    readonly length: number

    key(index: number): string | null

    getItem(key: string): string | null

    setItem(key: string, value: string): void

    removeItem(key: string): void

    clear(): void
}

/**
 * Reads every key from storage into a snapshot stamped with the given revision and save timestamp (both injected so the
 * function stays pure); no key is filtered, so location and pageScale are included.
 */
export function createSnapshot(storage: StorageLike, revision: string, savedAt: string): LibrarySnapshot {
    const entries: Record<string, string> = {}
    for (let index = 0; index < storage.length; index++) {
        const key = storage.key(index)
        if (key === null) continue
        const value = storage.getItem(key)
        if (value !== null) entries[key] = value
    }
    return {version: CURRENT_VERSION, revision, savedAt, entries}
}

/**
 * Migrates the snapshot up to the current version, clears storage, then writes its entries — a replace, not a merge, so
 * any pre-existing unrelated key is gone afterwards.
 */
export function applySnapshot(storage: StorageLike, snapshot: LibrarySnapshot): void {
    const migrated = migrateSnapshot(snapshot)
    storage.clear()
    for (const [key, value] of Object.entries(migrated.entries)) {
        storage.setItem(key, value)
    }
}

/**
 * A stable hash of a snapshot's entries (keys sorted before hashing, so insertion order never changes the result); used
 * as the base hash for dirty detection and conflict lineage.
 */
export function snapshotHash(snapshot: LibrarySnapshot): string {
    const sorted: Record<string, string> = {}
    for (const key of Object.keys(snapshot.entries).sort()) {
        sorted[key] = snapshot.entries[key]
    }
    return hashSum(sorted)
}
