/**
 * Pure pagination math for the notes editor: decides where the single editor's content flow breaks across stacked A4
 * sheets, given each top-level block's measured height and the per-sheet content capacity. No DOM, atoms, or React.
 */

/**
 * One measured top-level block of the editor: its border-box height and its vertical margins (px), kept apart so the
 * break math can collapse adjacent margins the way CSS does, plus whether it is a manual page-break node (which forces
 * the following block onto a new sheet).
 */
export interface BlockMeasurement {
    height: number
    marginTop: number
    marginBottom: number
    isManualBreak: boolean
}

/**
 * The sheet geometry the break math needs: the content height available on one sheet, and the vertical distance to skip
 * between one sheet's content and the next (its bottom margin + the inter-sheet gap + the next sheet's top margin).
 */
export interface PaginationConfig {
    contentCapacity: number
    interSheetSkip: number
}

/**
 * One computed page break: the index of the block it pushes onto a new sheet, and the spacer height to insert before
 * that block so it starts at the next sheet's content top.
 */
export interface PageBreak {
    beforeIndex: number
    spacerHeight: number
}

/**
 * Computes the page breaks for a sequence of measured blocks: a break falls before a block when the previous block was
 * a manual page break, or when adding the block would overflow the current sheet's content capacity. Adjacent block
 * margins are collapsed (as in CSS flow) so the used height — and each spacer — never drifts as the document grows.
 */
export function computeBreaks(blocks: BlockMeasurement[], config: PaginationConfig): PageBreak[] {
    const breaks: PageBreak[] = []
    let used = 0 // border-box bottom of the last placed block, relative to the current sheet's content top
    let previousMarginBottom = 0
    let atSheetStart = true
    for (let index = 0; index < blocks.length; index++) {
        const block = blocks[index]
        // The gap above this block is its top margin collapsed against the previous block's bottom margin (the full top
        // margin at a sheet start, where the spacer breaks the collapse).
        const topGap = atSheetStart ? block.marginTop : Math.max(previousMarginBottom, block.marginTop)
        const blockBottom = used + topGap + block.height
        const overflows = !atSheetStart && blockBottom > config.contentCapacity
        const followsManualBreak = index > 0 && blocks[index - 1].isManualBreak
        if (!atSheetStart && (overflows || followsManualBreak)) {
            // Fill from the finishing sheet's last content edge (its border bottom plus bottom margin) through the
            // inter-sheet skip, so this block's margin-top edge lands on the next sheet's content top.
            const spacerHeight = config.contentCapacity - (used + previousMarginBottom) + config.interSheetSkip
            breaks.push({beforeIndex: index, spacerHeight})
            used = block.marginTop + block.height
        } else {
            used = blockBottom
        }
        previousMarginBottom = block.marginBottom
        atSheetStart = false
    }
    return breaks
}

/**
 * The number of sheets the breaks imply (always at least one, so an empty document still renders its first sheet).
 */
export function pageCount(breaks: PageBreak[]): number {
    return breaks.length + 1
}
