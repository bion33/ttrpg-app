import {describe, expect, it} from 'vitest'
import type {LibrarySnapshot} from '@lib/storage/snapshot.ts'
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

    it('brings an older snapshot up to the current version, running the real migrations', () => {
        const migrated = migrateSnapshot(snapshotAt(1, {a: '1', b: '2'}))
        expect(migrated.version).toBe(CURRENT_VERSION)
        // No shipped migration touches ordinary character keys, so these entries survive unchanged.
        expect(migrated.entries).toEqual({a: '1', b: '2'})
    })
})

describe('runMigrations', () => {
    // Fake steps prove the engine applies newer migrations in order, filtered by phase, without the shipped list.
    const migrations: Migration[] = [
        {to: 2, phase: 'both', migrate: (entries) => ({...entries, steps: '1'})},
        {to: 3, phase: 'both', migrate: (entries) => ({...entries, steps: `${entries.steps}2`})},
    ]

    it('applies every migration newer than the starting version, in order', () => {
        expect(runMigrations({}, 1, migrations, 'boot')).toEqual({steps: '12'})
    })

    it('skips migrations at or below the starting version', () => {
        expect(runMigrations({steps: 'kept'}, 2, migrations, 'boot')).toEqual({steps: 'kept2'})
    })

    it('does nothing when the starting version is already current', () => {
        expect(runMigrations({a: '1'}, 3, migrations, 'boot')).toEqual({a: '1'})
    })

    it('runs only migrations whose phase matches (a both-phase step runs in either)', () => {
        const phased: Migration[] = [
            {to: 2, phase: 'snapshot', migrate: (entries) => ({...entries, snap: 'y'})},
            {to: 3, phase: 'boot', migrate: (entries) => ({...entries, boot: 'y'})},
            {to: 4, phase: 'both', migrate: (entries) => ({...entries, both: 'y'})},
        ]
        expect(runMigrations({}, 1, phased, 'boot')).toEqual({boot: 'y', both: 'y'})
        expect(runMigrations({}, 1, phased, 'snapshot')).toEqual({snap: 'y', both: 'y'})
    })
})
