/**
 * Which component a page renders: an interactive character sheet, or the empty stand-in page.
 */
export type PageType = 'characterSheet' | 'empty'

/**
 * The selectable page types and their human labels, in menu order.
 */
export const PAGE_TYPES: {value: PageType; label: string}[] = [
    {value: 'characterSheet', label: 'Character sheet'},
    {value: 'empty', label: 'Empty'},
]
