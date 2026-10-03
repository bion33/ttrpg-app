import {describe, expect, it} from 'vitest'
import {abilityModifier, abilityModifierValue} from './abilities.ts'

describe('abilityModifier', () => {
    it('is 0 for the baseline scores 10 and 11', () => {
        expect(abilityModifier(10)).toBe(0)
        expect(abilityModifier(11)).toBe(0)
    })

    it('rounds down toward negative infinity at odd scores', () => {
        expect(abilityModifier(12)).toBe(1)
        expect(abilityModifier(13)).toBe(1)
        expect(abilityModifier(9)).toBe(-1)
        expect(abilityModifier(8)).toBe(-1)
    })

    it('handles the extremes of the range', () => {
        expect(abilityModifier(1)).toBe(-5)
        expect(abilityModifier(20)).toBe(5)
        expect(abilityModifier(30)).toBe(10)
    })
})

describe('abilityModifierValue', () => {
    it('is null when both score and extra are blank', () => {
        expect(abilityModifierValue(null)).toBeNull()
        expect(abilityModifierValue(null, null)).toBeNull()
    })

    it('treats a blank score or extra as zero when the other is present', () => {
        expect(abilityModifierValue(16)).toBe(3)
        expect(abilityModifierValue(16, null)).toBe(3)
        expect(abilityModifierValue(null, 2)).toBe(-4)
    })

    it('sums score and extra before taking the modifier', () => {
        expect(abilityModifierValue(14, 2)).toBe(3)
        expect(abilityModifierValue(8, 1)).toBe(-1)
    })
})
