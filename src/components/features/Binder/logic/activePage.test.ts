import {describe, expect, it} from 'vitest'
import {activePage} from './activePage.ts'

describe('activePage', () => {
    it('parses a stored page id', () => {
        expect(activePage(JSON.stringify('page-1'))).toBe('page-1')
    })

    it('is empty for missing data', () => {
        expect(activePage(null)).toBe('')
    })

    it('is empty for malformed JSON', () => {
        expect(activePage('{not json')).toBe('')
    })

    it('is empty when the stored value is not a string', () => {
        expect(activePage(JSON.stringify(42))).toBe('')
    })
})
