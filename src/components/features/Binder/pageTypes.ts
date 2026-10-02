/**
 * Which component a page renders: an interactive character sheet, a WYSIWYG markdown notes page, or the empty stand-in.
 */
export type PageType = 'characterSheet' | 'characterInfo' | 'equipment' | 'markdown' | 'empty'

/**
 * The page types a user can add, with their human labels, in menu order (the `empty` type is a default-only stand-in).
 */
export const PAGE_TYPES: { value: PageType; label: string }[] = [
    {value: 'characterSheet', label: 'Character sheet'},
    {value: 'characterInfo', label: 'Character info'},
    {value: 'equipment', label: 'Equipment'},
    {value: 'markdown', label: 'Notes'},
]
