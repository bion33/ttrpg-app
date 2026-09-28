import {describe, expect, it} from 'vitest'
import {binderId} from './binderId.ts'

describe('binderId', () => {
    it('produces a GUID-shaped string', () => {
        expect(binderId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    })

    it('produces a distinct id each call', () => {
        const ids = new Set(Array.from({length: 100}, () => binderId()))
        expect(ids.size).toBe(100)
    })
})
