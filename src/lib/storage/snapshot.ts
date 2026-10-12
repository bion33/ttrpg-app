import hashSum from 'hash-sum'
import {CURRENT_VERSION, migrateSnapshot, MIGRATIONS, runMigrations} from '../../migrations/migrations.ts'

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

// The device-local key holding the schema version the live localStorage conforms to, so the boot migration knows where
// to start. Kept out of the snapshot (it describes this device's local shape, not shared content).
export const SCHEMA_VERSION_KEY = 'schemaVersion'

/**
 * Per-device keys excluded from the snapshot so they never sync between devices, and preserved locally across a load:
 * the page zoom level and the local schema version.
 */
export const SYNC_IGNORE_KEYS = new Set(['location', 'pageWidthFraction', SCHEMA_VERSION_KEY])

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
 * function stays pure); per-device view keys are left out so they never sync.
 */
export function createSnapshot(storage: StorageLike, revision: string, savedAt: string): LibrarySnapshot {
    const entries: Record<string, string> = {}
    for (let index = 0; index < storage.length; index++) {
        const key = storage.key(index)
        if (key === null || SYNC_IGNORE_KEYS.has(key)) continue
        const value = storage.getItem(key)
        if (value !== null) entries[key] = value
    }
    return {version: CURRENT_VERSION, revision, savedAt, entries}
}

/**
 * Migrates the snapshot up to the current version, clears storage, then writes its entries — a replace, not a merge, so
 * any pre-existing unrelated key is gone afterwards; the device's own view keys are carried across the clear untouched.
 */
export function applySnapshot(storage: StorageLike, snapshot: LibrarySnapshot): void {
    const migrated = migrateSnapshot(snapshot)
    const preservedView: Record<string, string> = {}
    for (const key of SYNC_IGNORE_KEYS) {
        const value = storage.getItem(key)
        if (value !== null) preservedView[key] = value
    }
    storage.clear()
    for (const [key, value] of Object.entries(migrated.entries)) {
        storage.setItem(key, value)
    }
    for (const [key, value] of Object.entries(preservedView)) {
        storage.setItem(key, value)
    }
}

/**
 * Runs the boot-phase migrations against live localStorage in place, bringing an existing install up to the current
 * schema before any atom reads it, then stamps the local schema version so it never re-runs. A missing version means a
 * pre-versioning install (defaults to 1); a brand-new empty store no-ops the transform and is simply stamped.
 */
export function migrateLocalStorage(storage: StorageLike): void {
    const stored = storage.getItem(SCHEMA_VERSION_KEY)
    const parsed = stored === null ? NaN : Number.parseInt(stored, 10)
    const fromVersion = Number.isNaN(parsed) ? 1 : parsed
    if (fromVersion >= CURRENT_VERSION) return
    const entries: Record<string, string> = {}
    for (let index = 0; index < storage.length; index++) {
        const key = storage.key(index)
        if (key === null) continue
        const value = storage.getItem(key)
        if (value !== null) entries[key] = value
    }
    const migrated = runMigrations(entries, fromVersion, MIGRATIONS, 'boot')
    storage.clear()
    for (const [key, value] of Object.entries(migrated)) storage.setItem(key, value)
    storage.setItem(SCHEMA_VERSION_KEY, String(CURRENT_VERSION))
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

/**
 * The base hash a loaded snapshot records once applied — migrated to the current version with per-device view keys
 * stripped — so a lineage recorded by keeping local (never applying it) matches one recorded by applying it.
 */
export function appliedBaseHash(snapshot: LibrarySnapshot): string {
    const migrated = migrateSnapshot(snapshot)
    const entries: Record<string, string> = {}
    for (const [key, value] of Object.entries(migrated.entries)) {
        if (SYNC_IGNORE_KEYS.has(key)) continue
        entries[key] = value
    }
    return snapshotHash({...migrated, entries})
}
