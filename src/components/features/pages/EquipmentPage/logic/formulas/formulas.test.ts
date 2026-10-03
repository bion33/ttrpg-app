import {describe, expect, it} from 'vitest'
import {
    carryCapacity,
    coinWeight,
    parseItemCount,
    totalItemWeight,
    totalStorageWeight,
    totalWeight
} from './formulas.ts'

describe('carryCapacity', () => {
    it('is 15 pounds per point of Strength', () => {
        expect(carryCapacity(10)).toBe(150)
        expect(carryCapacity(15)).toBe(225)
    })

    it('is zero for a Strength of zero', () => {
        expect(carryCapacity(0)).toBe(0)
    })
})

describe('totalWeight', () => {
    it('sums the weights, treating an empty (null) weight as zero', () => {
        expect(totalWeight([2, null, 3.5, null])).toBe(5.5)
    })

    it('is zero for no weights', () => {
        expect(totalWeight([])).toBe(0)
    })
})

describe('coinWeight', () => {
    it('is 0.02 pounds per coin across all denominations', () => {
        expect(coinWeight([50, 50, null, 0, null])).toBeCloseTo(2)
    })

    it('is zero for an empty purse', () => {
        expect(coinWeight([null, null, null, null, null])).toBe(0)
    })
})

describe('parseItemCount', () => {
    it('reads a trailing "| N" count, with or without a space', () => {
        expect(parseItemCount('Arrows | 20')).toBe(20)
        expect(parseItemCount('Arrows |20')).toBe(20)
    })

    it('reads a leading "N |" count, with or without a space', () => {
        expect(parseItemCount('20 | Arrows')).toBe(20)
        expect(parseItemCount('20| Arrows')).toBe(20)
    })

    it('prefers a trailing count over a leading one', () => {
        expect(parseItemCount('5 | Arrows | 20')).toBe(20)
    })

    it('is null when no count is encoded', () => {
        expect(parseItemCount('Longsword')).toBeNull()
        expect(parseItemCount('')).toBeNull()
    })
})

describe('totalItemWeight', () => {
    it('multiplies an encoded count by the row weight, defaulting an uncounted row to one', () => {
        expect(totalItemWeight([
            {item: 'Arrows | 20', weight: 0.05},
            {item: 'Longsword', weight: 3},
        ])).toBeCloseTo(4)
    })

    it('treats an empty weight as zero', () => {
        expect(totalItemWeight([{item: 'Arrows | 20', weight: null}])).toBe(0)
    })

    it('is zero for no rows', () => {
        expect(totalItemWeight([])).toBe(0)
    })
})

describe('totalStorageWeight', () => {
    it('sums each row count times its per-item weight', () => {
        expect(totalStorageWeight([{count: 3, weight: 2}, {count: 10, weight: 0.5}])).toBe(11)
    })

    it('treats a row with an empty count or weight as zero', () => {
        expect(totalStorageWeight([{count: null, weight: 5}, {count: 4, weight: null}])).toBe(0)
    })

    it('is zero for no rows', () => {
        expect(totalStorageWeight([])).toBe(0)
    })
})
