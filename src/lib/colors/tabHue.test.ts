import {describe, expect, it} from 'vitest'
import {tabHue} from './tabHue.ts'

describe('tabHue', () => {
    it('starts at the base hue for the first tab', () => {
        expect(tabHue(0)).toBe(38)
    })

    it('steps by the golden angle and wraps within 0–360', () => {
        expect(tabHue(1)).toBeCloseTo(175.5)
        expect(tabHue(2)).toBeCloseTo(313)
        expect(tabHue(3)).toBeCloseTo(90.5)
    })

    it('keeps every hue within the colour wheel', () => {
        for (let i = 0; i < 50; i++) {
            const hue = tabHue(i)
            expect(hue).toBeGreaterThanOrEqual(0)
            expect(hue).toBeLessThan(360)
        }
    })
})
