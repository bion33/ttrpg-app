/** The label and hue (degrees) of one of a binder's pages, used to draw a matching decorative tab on its cover. */
export interface BinderTab {
    label: string
    hue: number
}

/**
 * The decorative tabs of a binder's stored pages — one per page with its label and hue — so a cover's tabs mirror the
 * real pages inside it. Takes the binder's persisted page list (already parsed from storage) and projects each page to
 * its label and hue.
 */
export function binderTabs(pages: readonly { label: string; hue: number }[]): BinderTab[] {
    return pages.map((page) => ({label: page.label, hue: page.hue}))
}
