import {describe, expect, it} from 'vitest'
import {formatModifier} from './formatModifier.ts'

describe('formatModifier', () => {
    it('prefixes non-negative numbers with +', () => {
        expect(formatModifier(0)).toBe('+0')
        expect(formatModifier(3)).toBe('+3')
    })

    it('keeps the minus sign on negative numbers', () => {
        expect(formatModifier(-1)).toBe('-1')
        expect(formatModifier(-5)).toBe('-5')
    })
})
