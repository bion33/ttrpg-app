import {describe, expect, it} from 'vitest'
import {carryCapacity} from './formulas.ts'

describe('carryCapacity', () => {
    it('is 15 pounds per point of Strength', () => {
        expect(carryCapacity(10)).toBe(150)
        expect(carryCapacity(15)).toBe(225)
    })

    it('is zero for a Strength of zero', () => {
        expect(carryCapacity(0)).toBe(0)
    })
})
