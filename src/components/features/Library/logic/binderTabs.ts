/** The label and hue (degrees) of one of a binder's pages, used to draw a matching decorative tab on its cover. */
export interface BinderTab {
    label: string
    hue: number
}

/**
 * The decorative tabs of a binder's stored pages — one per page with its label and hue — parsed from the raw JSON
 * persisted under its `${id}:pages` key, so a cover's tabs mirror the real pages inside it. Returns an empty list for
 * missing or malformed data.
 */
export function binderTabs(raw: string | null): BinderTab[] {
    if (!raw) return []
    try {
        const pages = JSON.parse(raw)
        if (!Array.isArray(pages)) return []
        return pages
            .filter((page) => page && typeof page.hue === 'number')
            .map((page) => ({label: typeof page.label === 'string' ? page.label : '', hue: page.hue}))
    } catch {
        return []
    }
}
