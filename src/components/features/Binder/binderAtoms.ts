import type {WritableAtom} from 'jotai'
import {atomWithStorage} from 'jotai/utils'
import type {TabItem} from './tabs/Tabs.tsx'
import type {PageType} from './pageTypes.ts'

/**
 * A navigable page persisted to storage: tab metadata, its `type` (which component renders it), and the storage prefix
 * a character sheet's fields persist under (within its binder's namespace).
 */
export type Page = TabItem & {type: PageType; storagePrefix: string}

// ---- INTERNAL STATE ----

// One shared atom instance per storage prefix, cached so the binder and the library shelf read/write the same atom.
const pagesAtoms = new Map<string, WritableAtom<Page[], [Page[] | ((previous: Page[]) => Page[])], void>>()
const activePageAtoms = new Map<string, WritableAtom<string, [string | ((previous: string) => string)], void>>()

// ---- EXPORTED FUNCTIONS ----

/**
 * The persisted page list for the binder at the given storage prefix — one shared atom instance per prefix, so the
 * binder and the library shelf read and write the same list. Empty until the user adds a page.
 */
export function pagesAtom(prefix: string) {
    let existing = pagesAtoms.get(prefix)
    if (!existing) {
        existing = atomWithStorage<Page[]>(`${prefix}:pages`, [])
        pagesAtoms.set(prefix, existing)
    }
    return existing
}

/**
 * The binder's remembered last-active page id at the given storage prefix, so the library can reopen it at that page —
 * one shared atom instance per prefix.
 */
export function activePageAtom(prefix: string) {
    let existing = activePageAtoms.get(prefix)
    if (!existing) {
        existing = atomWithStorage(`${prefix}:activePage`, '')
        activePageAtoms.set(prefix, existing)
    }
    return existing
}
