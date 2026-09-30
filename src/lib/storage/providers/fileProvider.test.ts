import {describe, expect, it} from 'vitest'
import type {LibrarySnapshot} from '@lib/storage/snapshot.ts'
import {parseSnapshot, serialiseSnapshot} from './fileProvider.ts'

const snapshot: LibrarySnapshot = {
    version: 1,
    revision: 'rev-1',
    savedAt: '2026-01-01T00:00:00.000Z',
    entries: {binders: '[]', 'a:b': '"x"'},
}

describe('serialiseSnapshot / parseSnapshot', () => {
    it('round-trips a snapshot through JSON', () => {
        expect(parseSnapshot(serialiseSnapshot(snapshot))).toEqual(snapshot)
    })

    it('throws on non-JSON text', () => {
        expect(() => parseSnapshot('not json')).toThrow(/valid JSON/)
    })

    it('throws when a required field is missing', () => {
        expect(() => parseSnapshot(JSON.stringify({
            version: 1,
            revision: 'r',
            savedAt: 'now'
        }))).toThrow(/valid library/)
    })

    it('throws when an entry value is not a string', () => {
        const bad = {version: 1, revision: 'r', savedAt: 'now', entries: {a: 1}}
        expect(() => parseSnapshot(JSON.stringify(bad))).toThrow(/valid library/)
    })

    it('throws when version is not a number', () => {
        const bad = {version: '1', revision: 'r', savedAt: 'now', entries: {}}
        expect(() => parseSnapshot(JSON.stringify(bad))).toThrow(/valid library/)
    })
})
