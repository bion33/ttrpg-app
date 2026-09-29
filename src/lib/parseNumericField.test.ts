import {describe, expect, it} from 'vitest'
import {parseNumericField} from './parseNumericField.ts'

describe('parseNumericField', () => {
    it('returns null for blank or whitespace-only input', () => {
        expect(parseNumericField('')).toBeNull()
        expect(parseNumericField('   ')).toBeNull()
    })

    it('returns null for non-numeric input', () => {
        expect(parseNumericField('abc')).toBeNull()
        expect(parseNumericField('1.2.3')).toBeNull()
    })

    it('parses integers and decimals, ignoring surrounding whitespace', () => {
        expect(parseNumericField('42')).toBe(42)
        expect(parseNumericField('  -3 ')).toBe(-3)
        expect(parseNumericField('2.5')).toBe(2.5)
    })

    it('treats zero as a value, not blank', () => {
        expect(parseNumericField('0')).toBe(0)
    })
})
