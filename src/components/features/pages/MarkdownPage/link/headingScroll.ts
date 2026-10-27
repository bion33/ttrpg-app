/**
 * Finds the heading element carrying the given anchor slug within `root`, or null if it is not rendered yet. Scoped to
 * `root` because several editors (one per mounted page) can share heading ids.
 */
export function findHeading(root: ParentNode, slug: string): HTMLElement | null {
    const target = root.querySelector(`[id="${CSS.escape(slug)}"]`)
    return target instanceof HTMLElement ? target : null
}

// How many animation frames the heading's offset must hold steady, and the frame budget before scrolling regardless.
const SETTLE_FRAMES = 2
const FRAME_BUDGET = 60

/**
 * Smooth-scrolls the heading with the given slug to the top of `root` once the layout above it has settled. Waits for
 * the offset to stop moving (pagination inserts spacer gaps and late images load after the anchor first appears, which
 * would otherwise push the heading down mid-animation) or the frame budget to run out. Returns a cancel function.
 */
export function scrollHeadingIntoView(root: HTMLElement, slug: string): () => void {
    let frame = 0
    let attempts = 0
    let settledFrames = 0
    let lastOffset = Number.NaN
    const align = () => {
        const giveUp = attempts++ > FRAME_BUDGET
        const target = findHeading(root, slug)
        if (target) {
            const offset = Math.round(target.getBoundingClientRect().top - root.getBoundingClientRect().top)
            settledFrames = offset === lastOffset ? settledFrames + 1 : 0
            lastOffset = offset
            if (settledFrames >= SETTLE_FRAMES || giveUp) {
                target.scrollIntoView({behavior: 'smooth', block: 'start'})
                return
            }
        } else if (giveUp) return
        frame = requestAnimationFrame(align)
    }
    frame = requestAnimationFrame(align)
    return () => cancelAnimationFrame(frame)
}
