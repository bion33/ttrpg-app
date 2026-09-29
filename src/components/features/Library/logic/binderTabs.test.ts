import {describe, expect, it} from 'vitest'
import {binderTabs} from './binderTabs.ts'

describe('binderTabs', () => {
    it('projects each stored page to its label and hue, in order', () => {
        const pages = [
            {id: 'a', label: 'Fighter', hue: 40, type: 'characterSheet', storagePrefix: 'a'},
            {id: 'b', label: 'Notes', hue: 200, type: 'empty', storagePrefix: 'b'},
        ]
        expect(binderTabs(pages)).toEqual([{label: 'Fighter', hue: 40}, {label: 'Notes', hue: 200}])
    })

    it('returns an empty list for no stored pages', () => {
        expect(binderTabs([])).toEqual([])
    })
})
