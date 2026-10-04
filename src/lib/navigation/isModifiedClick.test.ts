import {describe, expect, it} from 'vitest'
import {isModifiedClick} from './isModifiedClick.ts'

const plainClick = {defaultPrevented: false, button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false}

describe('isModifiedClick', () => {
    it('does not flag a plain left click', () => {
        expect(isModifiedClick(plainClick)).toBe(false)
    })

    it('flags an already-handled click', () => {
        expect(isModifiedClick({...plainClick, defaultPrevented: true})).toBe(true)
    })

    it('flags a non-primary button', () => {
        expect(isModifiedClick({...plainClick, button: 1})).toBe(true)
    })

    it('flags each held modifier', () => {
        expect(isModifiedClick({...plainClick, metaKey: true})).toBe(true)
        expect(isModifiedClick({...plainClick, ctrlKey: true})).toBe(true)
        expect(isModifiedClick({...plainClick, shiftKey: true})).toBe(true)
        expect(isModifiedClick({...plainClick, altKey: true})).toBe(true)
    })
})
