import {describe, expect, it} from 'vitest'
import {binderTabs} from './binderTabs.ts'

describe('binderTabs', () => {
    it('returns the label and hue of each stored page in order', () => {
        const raw = JSON.stringify([{id: 'a', label: 'Fighter', hue: 40}, {id: 'b', label: 'Notes', hue: 200}])
        expect(binderTabs(raw)).toEqual([{label: 'Fighter', hue: 40}, {label: 'Notes', hue: 200}])
    })

    it('returns an empty list for no stored pages', () => {
        expect(binderTabs(null)).toEqual([])
        expect(binderTabs('[]')).toEqual([])
    })

    it('skips entries without a numeric hue and defaults a missing label to empty', () => {
        const raw = JSON.stringify([{id: 'a', hue: 40}, {id: 'b'}, {id: 'c', label: 'X', hue: 120}])
        expect(binderTabs(raw)).toEqual([{label: '', hue: 40}, {label: 'X', hue: 120}])
    })

    it('returns an empty list for malformed data', () => {
        expect(binderTabs('not json')).toEqual([])
        expect(binderTabs('{"not":"an array"}')).toEqual([])
    })
})
