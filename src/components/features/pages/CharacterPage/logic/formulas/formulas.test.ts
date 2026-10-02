import {describe, expect, it} from 'vitest'
import {abilityModifier, abilityModifierValue, formatModifier, halfSpeed, passivePerception, skillBonus} from './formulas.ts'

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

describe('skillBonus', () => {
    it('is just the modifier when not proficient', () => {
        expect(skillBonus(3, 2, false, false)).toBe(3)
        expect(skillBonus(-1, 4, false, true)).toBe(-1)
    })

    it('adds the proficiency bonus when proficient', () => {
        expect(skillBonus(3, 2, true, false)).toBe(5)
        expect(skillBonus(-1, 3, true, false)).toBe(2)
    })

    it('doubles the proficiency bonus with expertise', () => {
        expect(skillBonus(3, 2, true, true)).toBe(7)
        expect(skillBonus(0, 4, true, true)).toBe(8)
    })
})

describe('formatModifier', () => {
    it('prefixes non-negative modifiers with +', () => {
        expect(formatModifier(0)).toBe('+0')
        expect(formatModifier(3)).toBe('+3')
    })

    it('keeps the minus sign on negative modifiers', () => {
        expect(formatModifier(-1)).toBe('-1')
        expect(formatModifier(-5)).toBe('-5')
    })
})

describe('passivePerception', () => {
    it('is 10 plus the Perception modifier', () => {
        expect(passivePerception(0)).toBe(10)
        expect(passivePerception(3)).toBe(13)
        expect(passivePerception(-2)).toBe(8)
    })
})

describe('halfSpeed', () => {
    it('halves the walking speed, rounding down', () => {
        expect(halfSpeed(30)).toBe(15)
        expect(halfSpeed(25)).toBe(12)
        expect(halfSpeed(0)).toBe(0)
    })
})
