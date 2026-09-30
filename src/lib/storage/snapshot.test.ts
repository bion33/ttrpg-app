import {describe, expect, it} from 'vitest'
import type {StorageLike} from './snapshot.ts'
import {applySnapshot, createSnapshot, snapshotHash} from './snapshot.ts'
import {CURRENT_VERSION} from '../../migrations/migrations.ts'

/** A minimal in-memory Storage used to exercise the snapshot layer without a real localStorage. */
function fakeStorage(initial: Record<string, string> = {}): StorageLike {
    const map = new Map(Object.entries(initial))
    return {
        get length() {
            return map.size
        },
        key(index) {
            return Array.from(map.keys())[index] ?? null
        },
        getItem(key) {
            return map.has(key) ? map.get(key)! : null
        },
        setItem(key, value) {
            map.set(key, value)
        },
        removeItem(key) {
            map.delete(key)
        },
        clear() {
            map.clear()
        },
    }
}

describe('createSnapshot', () => {
    it('reads every key with no filtering and stamps the current version', () => {
        const storage = fakeStorage({binders: '[]', location: '{}', pageScale: '1'})
        const snapshot = createSnapshot(storage, 'rev-1', '2026-01-01T00:00:00.000Z')
        expect(snapshot.entries).toEqual({binders: '[]', location: '{}', pageScale: '1'})
        expect(snapshot.version).toBe(CURRENT_VERSION)
        expect(snapshot.revision).toBe('rev-1')
        expect(snapshot.savedAt).toBe('2026-01-01T00:00:00.000Z')
    })

    it('produces empty entries for an empty store', () => {
        expect(createSnapshot(fakeStorage(), 'rev', 'now').entries).toEqual({})
    })
})

describe('applySnapshot', () => {
    it('round-trips: create then apply into a fresh store yields identical keys', () => {
        const source = fakeStorage({a: '1', b: '2'})
        const snapshot = createSnapshot(source, 'rev', 'now')
        const destination = fakeStorage()
        applySnapshot(destination, snapshot)
        expect(createSnapshot(destination, 'rev2', 'now2').entries).toEqual({a: '1', b: '2'})
    })

    it('replaces rather than merges: a pre-existing unrelated key is gone after apply', () => {
        const destination = fakeStorage({stale: 'x'})
        applySnapshot(destination, createSnapshot(fakeStorage({fresh: 'y'}), 'rev', 'now'))
        expect(destination.getItem('stale')).toBeNull()
        expect(destination.getItem('fresh')).toBe('y')
    })
})

describe('snapshotHash', () => {
    it('is stable under key reordering', () => {
        const first = createSnapshot(fakeStorage({a: '1', b: '2'}), 'r1', 't1')
        const second = createSnapshot(fakeStorage({b: '2', a: '1'}), 'r2', 't2')
        expect(snapshotHash(first)).toBe(snapshotHash(second))
    })

    it('changes when a value changes', () => {
        const base = createSnapshot(fakeStorage({a: '1'}), 'r', 't')
        const changed = createSnapshot(fakeStorage({a: '2'}), 'r', 't')
        expect(snapshotHash(base)).not.toBe(snapshotHash(changed))
    })
})
