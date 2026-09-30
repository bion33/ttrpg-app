import {describe, expect, it} from 'vitest'
import {newId} from './newId.ts'

describe('newId', () => {
    it('produces a GUID-shaped string', () => {
        expect(newId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    })

    it('produces a distinct id each call', () => {
        const ids = new Set(Array.from({length: 100}, () => newId()))
        expect(ids.size).toBe(100)
    })
})
