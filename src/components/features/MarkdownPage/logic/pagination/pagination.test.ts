import {describe, expect, it} from 'vitest'
import {type BlockMeasurement, computeBreaks, pageCount} from './pagination.ts'

// A plain content block of the given height and optional vertical margins (never a manual break).
function block(height: number, marginTop = 0, marginBottom = 0): BlockMeasurement {
    return {height, marginTop, marginBottom, isManualBreak: false}
}

// A manual page-break block (thin on-screen rule) that forces the following block onto a new sheet.
function manualBreak(height = 10): BlockMeasurement {
    return {height, marginTop: 0, marginBottom: 0, isManualBreak: true}
}

// capacity 100, inter-sheet skip 30, for readable sums.
const config = {contentCapacity: 100, interSheetSkip: 30}

describe('computeBreaks', () => {
    it('returns no breaks when the content fits one sheet', () => {
        expect(computeBreaks([block(40), block(50)], config)).toEqual([])
    })

    it('returns no breaks for an empty document', () => {
        expect(computeBreaks([], config)).toEqual([])
    })

    it('never breaks before the first block, even one taller than a sheet', () => {
        expect(computeBreaks([block(250)], config)).toEqual([])
    })

    it('breaks before the block that would overflow the current sheet', () => {
        // 60 + 50 = 110 > 100, so the second block starts a new sheet; spacer fills 100-60 + 30 = 70.
        expect(computeBreaks([block(60), block(50)], config)).toEqual([{beforeIndex: 1, spacerHeight: 70}])
    })

    it('breaks after a manual break regardless of remaining space', () => {
        // The manual break and the following block both fit, but the block still moves to a new sheet.
        expect(computeBreaks([block(20), manualBreak(), block(20)], config)).toEqual([
            {beforeIndex: 2, spacerHeight: 100 - 30 + 30},
        ])
    })

    it('accumulates across several sheets', () => {
        const breaks = computeBreaks([block(70), block(70), block(70)], config)
        expect(breaks).toEqual([
            {beforeIndex: 1, spacerHeight: 60},
            {beforeIndex: 2, spacerHeight: 60},
        ])
    })

    it('starts a new sheet after an oversized block, with a non-positive remaining spacer', () => {
        // The first block overflows its sheet (documented limitation); the next block still breaks before it.
        const breaks = computeBreaks([block(250), block(40)], config)
        expect(breaks).toEqual([{beforeIndex: 1, spacerHeight: 100 - 250 + 30}])
    })

    it('ignores a trailing manual break with nothing after it', () => {
        expect(computeBreaks([block(20), manualBreak()], config)).toEqual([])
    })

    it('collapses adjacent block margins instead of summing them', () => {
        // Each block is 30 tall with 10px top and bottom margins. Collapsed flow: first block border bottom at 40
        // (top margin 10 + height 30), then +max(10,10)+30 = 80, then +max(10,10)+30 = 120 > 100, so the third block
        // breaks. Summing the margins (height 50 each) would overflow a sheet sooner and drift the spacer.
        const blocks = [block(30, 10, 10), block(30, 10, 10), block(30, 10, 10)]
        // Spacer fills 100 - (80 + 10 bottom margin) + 30 skip = 40.
        expect(computeBreaks(blocks, config)).toEqual([{beforeIndex: 2, spacerHeight: 40}])
    })

    it('uses a block top margin as the gap at a sheet start', () => {
        // The second block (height 70, top margin 10) breaks: 60 + max(0,10) + 70 = 140 > 100. On the new sheet its
        // top margin is the gap above it (80 = 10 + 70), leaving room for the small trailing block on the new sheet.
        expect(computeBreaks([block(60), block(70, 10, 0), block(10, 10, 0)], config)).toEqual([
            {beforeIndex: 1, spacerHeight: 70},
        ])
    })
})

describe('pageCount', () => {
    it('is one sheet more than the number of breaks', () => {
        expect(pageCount([])).toBe(1)
        expect(pageCount([{beforeIndex: 1, spacerHeight: 10}, {beforeIndex: 3, spacerHeight: 10}])).toBe(3)
    })
})
