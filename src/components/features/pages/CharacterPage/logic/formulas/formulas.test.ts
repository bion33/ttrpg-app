import {describe, expect, it} from 'vitest'
import {halfSpeed, passivePerception, skillBonus} from './formulas.ts'

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
