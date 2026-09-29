import {describe, expect, it} from 'vitest'
import type {LibrarySnapshot} from '../lib/snapshot.ts'
import type {Migration} from './migrations.ts'
import {CURRENT_VERSION, migrateSnapshot, runMigrations} from './migrations.ts'

/** Builds a snapshot at a given version wrapping the given entries, for migration tests. */
function snapshotAt(version: number, entries: Record<string, string>): LibrarySnapshot {
    return {version, revision: 'rev', savedAt: 'now', entries}
}

describe('migrateSnapshot', () => {
    it('is a no-op at the current version', () => {
        const snapshot = snapshotAt(CURRENT_VERSION, {a: '1'})
        expect(migrateSnapshot(snapshot)).toEqual(snapshot)
    })

    it('rejects a snapshot from a newer version', () => {
        expect(() => migrateSnapshot(snapshotAt(CURRENT_VERSION + 1, {}))).toThrow(/newer app version/)
    })

    it('brings an older snapshot up to the current version, running the real (no-op) migrations', () => {
        const migrated = migrateSnapshot(snapshotAt(1, {a: '1', b: '2'}))
        expect(migrated.version).toBe(CURRENT_VERSION)
        // The shipped migrations are identity, so the entries survive unchanged.
        expect(migrated.entries).toEqual({a: '1', b: '2'})
    })
})

describe('runMigrations', () => {
    // Two fake steps prove the engine applies newer migrations in order without relying on the shipped list.
    const migrations: Migration[] = [
        {to: 2, migrate: (entries) => ({...entries, steps: '1'})},
        {to: 3, migrate: (entries) => ({...entries, steps: `${entries.steps}2`})},
    ]

    it('applies every migration newer than the starting version, in order', () => {
        expect(runMigrations({}, 1, migrations)).toEqual({steps: '12'})
    })

    it('skips migrations at or below the starting version', () => {
        expect(runMigrations({steps: 'kept'}, 2, migrations)).toEqual({steps: 'kept2'})
    })

    it('does nothing when the starting version is already current', () => {
        expect(runMigrations({a: '1'}, 3, migrations)).toEqual({a: '1'})
    })
})
