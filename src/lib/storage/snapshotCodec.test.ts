import {describe, expect, it} from 'vitest'
import type {LibrarySnapshot} from './snapshot.ts'
import {
    extractMetadata,
    metadataLocator,
    parseMetadata,
    parseSnapshot,
    serialiseInvalidatedMetadata,
    serialiseMetadata,
    serialiseSnapshot,
} from './snapshotCodec.ts'

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

describe('extractMetadata / serialiseMetadata / parseMetadata', () => {
    it('extracts the header without the entries', () => {
        expect(extractMetadata(snapshot)).toEqual({version: 1, revision: 'rev-1', savedAt: '2026-01-01T00:00:00.000Z'})
    })

    it('round-trips metadata through JSON', () => {
        expect(parseMetadata(serialiseMetadata(extractMetadata(snapshot)))).toEqual(extractMetadata(snapshot))
    })

    it('returns null for the invalidation marker, so the caller falls back to the body', () => {
        expect(parseMetadata(serialiseInvalidatedMetadata())).toBeNull()
    })

    it('throws on non-JSON text', () => {
        expect(() => parseMetadata('not json')).toThrow(/valid JSON/)
    })

    it('throws when a required field is missing or mistyped', () => {
        expect(() => parseMetadata(JSON.stringify({version: 1, revision: 'r'}))).toThrow(/valid snapshot metadata/)
        expect(() => parseMetadata(JSON.stringify({version: '1', revision: 'r', savedAt: 'now'})))
            .toThrow(/valid snapshot metadata/)
    })
})

describe('metadataLocator', () => {
    it('swaps a trailing .json for .metadata.json', () => {
        expect(metadataLocator('ttrpg-app.json')).toBe('ttrpg-app.metadata.json')
        expect(metadataLocator('https://host/dav/files/me/dir/library.json'))
            .toBe('https://host/dav/files/me/dir/library.metadata.json')
    })

    it('appends .metadata.json when there is no .json extension', () => {
        expect(metadataLocator('library')).toBe('library.metadata.json')
    })
})
