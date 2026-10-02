import {describe, expect, it} from 'vitest'
import {compareByLabel} from './compareByLabel.ts'

describe('compareByLabel', () => {
    it('orders by label ignoring case', () => {
        const sorted = [{label: 'banana'}, {label: 'Apple'}, {label: 'cherry'}].sort(compareByLabel)
        expect(sorted.map((item) => item.label)).toEqual(['Apple', 'banana', 'cherry'])
    })

    it('returns zero for labels equal apart from case', () => {
        expect(compareByLabel({label: 'Notes'}, {label: 'notes'})).toBe(0)
    })
})
