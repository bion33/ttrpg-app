import {describe, expect, it} from 'vitest'
import {v2} from './v2.ts'

describe('v2 migration', () => {
    it('targets version 2', () => {
        expect(v2.to).toBe(2)
    })

    it('returns the entries unchanged (identity)', () => {
        const entries = {a: '1', b: '2'}
        expect(v2.migrate(entries)).toEqual(entries)
    })

    it('returns a new object rather than the same reference', () => {
        const entries = {a: '1'}
        expect(v2.migrate(entries)).not.toBe(entries)
    })
})
