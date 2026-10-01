import {describe, expect, it} from 'vitest'
import {A4_WIDTH_PX, A5_WIDTH_PX, CSS_DPI, millimetresToPixels} from './paperSize.ts'

describe('millimetresToPixels', () => {
    it('maps one inch (25.4mm) to the CSS dpi', () => {
        expect(millimetresToPixels(25.4)).toBeCloseTo(CSS_DPI, 10)
    })

    it('maps zero to zero', () => {
        expect(millimetresToPixels(0)).toBe(0)
    })

    it('scales linearly', () => {
        expect(millimetresToPixels(50)).toBeCloseTo(2 * millimetresToPixels(25), 10)
    })
})

describe('paper widths', () => {
    it('derives A4 width (210mm) at 96dpi', () => {
        expect(A4_WIDTH_PX).toBeCloseTo(793.7007874, 6)
    })

    it('derives A5 width (148mm) at 96dpi', () => {
        expect(A5_WIDTH_PX).toBeCloseTo(559.3700787, 6)
    })
})
