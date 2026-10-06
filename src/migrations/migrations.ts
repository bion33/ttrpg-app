import type {LibrarySnapshot} from '@lib/storage/snapshot.ts'
import {v2} from './v2.ts'
import {v3} from './v3.ts'

/**
 * One append-only schema migration: the version it produces (its predecessor is `to - 1`) and a pure transform of the
 * entries map from that predecessor's shape to its own.
 */
export interface Migration {
    to: number

    migrate(entries: Record<string, string>): Record<string, string>
}

// One file per migration in this directory, listed here in ascending `to` order; never edit or renumber an existing
// entry, only append. Version numbers are meaningless on their own — they exist only to trigger migrations.
export const MIGRATIONS: Migration[] = [
    v2,
    v3
]

/** The schema version fresh snapshots are stamped with: the highest migration target, or 1 when there are none. */
export const CURRENT_VERSION = MIGRATIONS.reduce((max, migration) => Math.max(max, migration.to), 1)

/**
 * Applies, in order, every migration in the list newer than the entries' starting version, bringing the entries up to
 * that list's target shape.
 */
export function runMigrations(
    entries: Record<string, string>,
    fromVersion: number,
    migrations: Migration[],
): Record<string, string> {
    let migrated = entries
    for (const migration of migrations) {
        if (migration.to > fromVersion) migrated = migration.migrate(migrated)
    }
    return migrated
}

/**
 * Brings a snapshot up to CURRENT_VERSION by running every newer migration in order; rejects a snapshot from a version
 * newer than this app understands rather than corrupting it.
 */
export function migrateSnapshot(snapshot: LibrarySnapshot): LibrarySnapshot {
    if (snapshot.version > CURRENT_VERSION) throw new Error('Snapshot is from a newer app version')
    const entries = runMigrations(snapshot.entries, snapshot.version, MIGRATIONS)
    return {...snapshot, version: CURRENT_VERSION, entries}
}
