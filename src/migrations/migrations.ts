import type {LibrarySnapshot} from '@lib/storage/snapshot.ts'
import {v2} from './v2.ts'
import {v3} from './v3.ts'
import {v4} from './v4.ts'

/**
 * When a migration runs: `'snapshot'` only when applying an incoming snapshot (a normalization of another device's
 * data that must not touch live local data), `'boot'` only at startup against live localStorage, or `'both'` when it
 * changes the canonical stored shape and so must converge every path on that shape.
 */
export type MigrationPhase = 'boot' | 'snapshot' | 'both'

/**
 * One append-only schema migration: the version it produces (its predecessor is `to - 1`), the phase it runs in, and a
 * pure transform of the entries map from that predecessor's shape to its own.
 */
export interface Migration {
    to: number
    phase: MigrationPhase

    migrate(entries: Record<string, string>): Record<string, string>
}

// One file per migration in this directory, listed here in ascending `to` order; never edit or renumber an existing
// entry, only append. Version numbers are meaningless on their own — they exist only to trigger migrations.
export const MIGRATIONS: Migration[] = [
    v2,
    v3,
    v4,
]

/** The schema version fresh snapshots are stamped with: the highest migration target, or 1 when there are none. */
export const CURRENT_VERSION = MIGRATIONS.reduce((max, migration) => Math.max(max, migration.to), 1)

/**
 * Applies, in order, every migration newer than the entries' starting version whose phase matches the given phase
 * (a `'both'` migration runs in either), bringing the entries up to that phase's target shape.
 */
export function runMigrations(
    entries: Record<string, string>,
    fromVersion: number,
    migrations: Migration[],
    phase: MigrationPhase,
): Record<string, string> {
    let migrated = entries
    for (const migration of migrations) {
        const runsInPhase = migration.phase === phase || migration.phase === 'both'
        if (migration.to > fromVersion && runsInPhase) migrated = migration.migrate(migrated)
    }
    return migrated
}

/**
 * Brings a snapshot up to CURRENT_VERSION by running every newer snapshot-phase migration in order; rejects a snapshot
 * from a version newer than this app understands rather than corrupting it.
 */
export function migrateSnapshot(snapshot: LibrarySnapshot): LibrarySnapshot {
    if (snapshot.version > CURRENT_VERSION) throw new Error('Snapshot is from a newer app version')
    const entries = runMigrations(snapshot.entries, snapshot.version, MIGRATIONS, 'snapshot')
    return {...snapshot, version: CURRENT_VERSION, entries}
}
