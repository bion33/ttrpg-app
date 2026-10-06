import {describe, expect, it} from 'vitest'
import {v3} from './v3.ts'

describe('v3 migration', () => {
    it('targets version 3', () => {
        expect(v3.to).toBe(3)
    })

    it('strips the synced per-device view keys', () => {
        const entries = {binders: '[]', location: '{}', pageWidthFraction: '0.5'}
        expect(v3.migrate(entries)).toEqual({binders: '[]'})
    })

    it('leaves character data untouched and returns a new object', () => {
        const entries = {binders: '["a"]', 'a:field': 'x'}
        const migrated = v3.migrate(entries)
        expect(migrated).toEqual(entries)
        expect(migrated).not.toBe(entries)
    })
})
