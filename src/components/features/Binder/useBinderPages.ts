import {useEffect, useState} from 'react'
import {useAtom, useSetAtom, useStore} from 'jotai'
import {useNavigate} from 'react-router'
import {uniqueSlug} from '@lib/navigation/slug.ts'
import {binderPath} from '@lib/navigation/routePaths.ts'
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
 * mounted. The active page is the one named by the URL's page slug (falling back to the first page). Keeps `Binder` a
 * thin layout component.
 */
export function useBinderPages(storagePrefix: string, activeSlug: string | undefined): BinderPages {
    const [pages, setPages] = useAtom(pagesAtom(storagePrefix))
    const store = useStore()
    const navigate = useNavigate()
    const rememberActivePage = useSetAtom(activePageAtom(storagePrefix))
    const activeIndex = Math.max(0, pages.findIndex((page) => page.id === activeSlug))
    const active = pages.length ? pages[activeIndex] : undefined
    // Grown during render (the endorsed "adjust state while rendering" pattern) as each shown page resolves; it lives
    // only for the binder's mount, so leaving the binder (which remounts it) clears the set.
    const [visited, setVisited] = useState<Set<string>>(() => new Set())
    if (active && !visited.has(active.id)) {
        setVisited(new Set(visited).add(active.id))
    }

    // Persists the resolved active page as this binder's remembered page, so reopening it returns here. Skipped when
    // there is no active page (an empty or unknown binder), so a stale URL leaves no empty remembered-page entry.
    const activeId = active?.id
    useEffect(() => {
        if (activeId) rememberActivePage(activeId)
    }, [activeId, rememberActivePage])

    // Appends a new page of the chosen type; its slug id doubles as the page's storage prefix. A markdown page created
    // from a template seeds its content from that template's live body.
    function createPage(name: string, type: PageType, markdownTemplateId?: string) {
        const id = uniqueSlug(name, pages.map((page) => page.id), 'page')
        setPages([...pages, {id, label: name, type, storagePrefix: id, hue: tabHue(pages.length)}])
        if (type === 'markdown' && markdownTemplateId) {
            seedMarkdownContent(store, pagePrefix(storagePrefix, id), markdownTemplateId)
        }
        navigate(binderPath(storagePrefix, id))
    }

    // Edits the active tab's label and hue (its id and stored fields are unchanged).
    function editPage(label: string, hue: number) {
        setPages((previous) => previous.map((page) => (page.id === active?.id ? {...page, label, hue} : page)))
    }

    // Removes the active page, then activates its neighbour so a page stays selected when one remains.
    function deletePage() {
        const index = pages.findIndex((page) => page.id === active?.id)
        const next = pages.filter((page) => page.id !== active?.id)
        setPages(next)
        navigate(binderPath(storagePrefix, next.length ? next[Math.min(index, next.length - 1)].id : undefined))
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
