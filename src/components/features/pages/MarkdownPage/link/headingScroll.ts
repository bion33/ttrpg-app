/**
 * Finds the heading element carrying the given anchor slug within `root`, or null if it is not rendered yet. Scoped to
 * `root` because several editors (one per mounted page) can share heading ids.
 */
export function findHeading(root: ParentNode, slug: string): HTMLElement | null {
    const target = root.querySelector(`[id="${CSS.escape(slug)}"]`)
    return target instanceof HTMLElement ? target : null
}
