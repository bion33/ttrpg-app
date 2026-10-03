import {useEffect, useState} from 'react'
import {useAtom, useSetAtom, useStore} from 'jotai'
import {useLocation, useNavigate} from '@hooks/useNavigation.ts'
import {newId} from '@lib/ids/newId.ts'
import {tabHue} from '@lib/colors/tabHue.ts'
import {seedMarkdownContent} from '@features/Templates/templateAtoms.ts'
import type {PageType} from './pageTypes.ts'
import type {Page} from './binderAtoms.ts'
import {activePageAtom, pagePrefix, pagesAtom} from './binderAtoms.ts'

/** The persisted page list of one binder plus the CRUD, reorder, active-page, and visited-set bookkeeping over it. */
export interface BinderPages {
    pages: Page[]
    active: Page | undefined
    // The ids of pages visited since the binder opened; each stays mounted (hidden when inactive) for instant switching.
    visited: Set<string>

    createPage(name: string, type: PageType, markdownTemplateId?: string): void

    editPage(label: string, hue: number): void

    deletePage(): void

    reorderPages(from: number, to: number): void
}

/**
 * Owns one binder's page list: the persisted pages/active-page atoms, the add/edit/delete/reorder handlers (each
 * navigating and persisting), the remembered-active-page mirror, and the visited-ids set that keeps visited pages
 * mounted. Keeps `Binder` a thin layout component.
 */
export function useBinderPages(storagePrefix: string): BinderPages {
    const [pages, setPages] = useAtom(pagesAtom(storagePrefix))
    const store = useStore()
    const location = useLocation()
    const navigate = useNavigate()
    const rememberActivePage = useSetAtom(activePageAtom(storagePrefix))
    const activeId = location.pageId
    const activeIndex = Math.max(0, pages.findIndex((page) => page.id === activeId))
    const active = pages.length ? pages[activeIndex] : undefined
    // Grown during render (the endorsed "adjust state while rendering" pattern) as each shown page resolves; it lives
    // only for the binder's mount, so leaving the binder (which remounts it) clears the set.
    const [visited, setVisited] = useState<Set<string>>(() => new Set())
    if (active && !visited.has(active.id)) {
        setVisited(new Set(visited).add(active.id))
    }

    // Persists the shown page as this binder's remembered active page, so reopening it returns here.
    useEffect(() => rememberActivePage(activeId), [activeId, rememberActivePage])

    // Appends a new page of the chosen type; its GUID id doubles as the page's storage prefix. A markdown page created
    // from a template seeds its content from that template's live body.
    function createPage(name: string, type: PageType, markdownTemplateId?: string) {
        const id = newId()
        setPages([...pages, {id, label: name, type, storagePrefix: id, hue: tabHue(pages.length)}])
        if (type === 'markdown' && markdownTemplateId) {
            seedMarkdownContent(store, pagePrefix(storagePrefix, id), markdownTemplateId)
        }
        navigate({binderId: storagePrefix, pageId: id})
    }

    // Edits the active tab's label and hue (its id and stored fields are unchanged).
    function editPage(label: string, hue: number) {
        setPages((previous) => previous.map((page) => (page.id === activeId ? {...page, label, hue} : page)))
    }

    // Removes the active page, then activates its neighbour so a page stays selected when one remains.
    function deletePage() {
        const index = pages.findIndex((page) => page.id === activeId)
        const next = pages.filter((page) => page.id !== activeId)
        setPages(next)
        navigate({binderId: storagePrefix, pageId: next.length ? next[Math.min(index, next.length - 1)].id : ''})
    }

    // Moves the page at index `from` to index `to`, persisting the new tab order.
    function reorderPages(from: number, to: number) {
        setPages((previous) => {
            const next = previous.slice()
            const [moved] = next.splice(from, 1)
            next.splice(to, 0, moved)
            return next
        })
    }

    return {pages, active, visited, createPage, editPage, deletePage, reorderPages}
}
