import {describe, expect, it} from 'vitest'
import {computeViewportInset} from './viewportInset.ts'

describe('computeViewportInset', () => {
    it('returns zero insets at rest (scale 1, no offset, no keyboard)', () => {
        const inset = computeViewportInset({
            innerWidth: 1024, innerHeight: 768, offsetLeft: 0, offsetTop: 0, height: 768, scale: 1,
        })
        expect(inset).toEqual({left: 0, top: 0, right: 0, bottom: 0, invScale: 1, keyboardInset: 0})
    })

    it('ignores a keyboard at scale 1 even when it pans offsetTop positive', () => {
        const inset = computeViewportInset({
            innerWidth: 390, innerHeight: 844, offsetLeft: 0, offsetTop: 300, height: 544, scale: 1,
        })
        expect(inset.left).toBe(0)
        expect(inset.top).toBe(0)
        expect(inset.bottom).toBe(0)
    })

    it('ignores a keyboard at scale 1 even when offsetTop reads negative (Safari scroll-into-view)', () => {
        const inset = computeViewportInset({
            innerWidth: 390, innerHeight: 844, offsetLeft: 0, offsetTop: -120, height: 544, scale: 1,
        })
        expect(inset.left).toBe(0)
        expect(inset.top).toBe(0)
        expect(inset.bottom).toBe(0)
    })

    it('reports the keyboard height (layout minus visual), independent of pan', () => {
        // Overlay keyboard: layout stays 844, visual shrinks to 544 → keyboard is 300, regardless of offsetTop.
        const atTop = computeViewportInset({
            innerWidth: 390, innerHeight: 844, offsetLeft: 0, offsetTop: 0, height: 544, scale: 1,
        })
        const panned = computeViewportInset({
            innerWidth: 390, innerHeight: 844, offsetLeft: 0, offsetTop: 200, height: 544, scale: 1,
        })
        expect(atTop.keyboardInset).toBe(300)
        expect(panned.keyboardInset).toBe(300)
    })

    it('reports no keyboard inset where the keyboard resizes the layout viewport (both shrink together)', () => {
        const inset = computeViewportInset({
            innerWidth: 390, innerHeight: 544, offsetLeft: 0, offsetTop: 0, height: 544, scale: 1,
        })
        expect(inset.keyboardInset).toBe(0)
    })

    it('follows the pinch rectangle when zoomed without a keyboard', () => {
        const inset = computeViewportInset({
            innerWidth: 400, innerHeight: 800, offsetLeft: 50, offsetTop: 100, height: 400, scale: 2,
        })
        // Geometric rectangle is 200x400; near edges read offset, far edges are the remaining gap.
        expect(inset).toEqual({left: 50, top: 100, right: 150, bottom: 300, invScale: 0.5, keyboardInset: 0})
    })

    it('drives the bottom gap from pinch geometry, so keyboard occlusion cannot reach it', () => {
        // The measured visual-viewport height (what a keyboard shrinks) is not an input to the pinch gaps; the bottom
        // gap is layout - offset - layout/scale, independent of any keyboard. 800 - 0 - 800/2 = 400.
        const inset = computeViewportInset({
            innerWidth: 400, innerHeight: 800, offsetLeft: 0, offsetTop: 0, height: 200, scale: 2,
        })
        expect(inset.bottom).toBe(400)
    })

    it('suppresses the keyboard inset while zoomed (a pinch shrinks the visual viewport on its own)', () => {
        const inset = computeViewportInset({
            innerWidth: 400, innerHeight: 800, offsetLeft: 0, offsetTop: 0, height: 200, scale: 2,
        })
        expect(inset.keyboardInset).toBe(0)
    })

    it('clamps negative gaps to zero', () => {
        const inset = computeViewportInset({
            innerWidth: 400, innerHeight: 800, offsetLeft: -10, offsetTop: -10, height: 500, scale: 1.5,
        })
        expect(inset.left).toBe(0)
        expect(inset.top).toBe(0)
        expect(inset.right).toBeGreaterThanOrEqual(0)
        expect(inset.bottom).toBeGreaterThanOrEqual(0)
    })
})
