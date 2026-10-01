import {describe, expect, it} from 'vitest'
import {binderSpineColor, binderSpineDark, binderSpineLight, tabBorderColor, tabColor} from './hueColors.ts'

describe('hueColors', () => {
    it('builds the binder spine gradient stops and midpoint at a hue', () => {
        expect(binderSpineLight(200)).toBe('hsl(200 45% 46%)')
        expect(binderSpineDark(200)).toBe('hsl(200 45% 34%)')
        expect(binderSpineColor(200)).toBe('hsl(200 45% 40%)')
    })

    it('builds the paper tab colour at a hue', () => {
        expect(tabColor(38)).toBe('hsl(38 55% 82%)')
    })

    it('builds the active tab page-border colour at a hue', () => {
        expect(tabBorderColor(38)).toBe('hsl(38 45% 40%)')
    })
})
