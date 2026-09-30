/**
 * Which component a page renders: an interactive character sheet, a WYSIWYG markdown notes page, or the empty stand-in.
 */
export type PageType = 'characterSheet' | 'markdown' | 'empty'

/**
 * The selectable page types and their human labels, in menu order.
 */
export const PAGE_TYPES: { value: PageType; label: string }[] = [
    {value: 'characterSheet', label: 'Character sheet'},
    {value: 'markdown', label: 'Notes'},
    {value: 'empty', label: 'Empty'},
]
