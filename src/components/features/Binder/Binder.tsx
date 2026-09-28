import type {CSSProperties, ReactNode} from 'react'
import {useEffect, useMemo, useRef, useState} from 'react'
import {useAtom} from 'jotai'
import {atomWithStorage} from 'jotai/utils'
import './Binder.css'
import Tabs, {type TabItem} from './Tabs.tsx'
import AddTabModal from './AddTabModal.tsx'
import TabControls from './TabControls.tsx'
import ViewControls from './ViewControls.tsx'
import {DeleteTabModal, EditTabModal} from './TabDialogs.tsx'
import type {PageType} from './pageTypes.ts'
import {tabHue} from './logic/tabHue.ts'
import {pageId} from './logic/pageId.ts'
import CharacterSheet from '../CharacterSheet/CharacterSheet'
import EmptyPage from '../EmptyPage/EmptyPage'

/**
 * A navigable page persisted to storage: tab metadata, its `type` (which component renders it), and the storage
 * prefix a character sheet's fields persist under (within its binder's namespace).
 */
type Page = TabItem & {type: PageType; storagePrefix: string}

/**
 * Props for a binder: the storage prefix (its library id) all its pages persist under, and the callback that returns
 * to the library shelf.
 */
interface BinderProps {
    storagePrefix: string
    onExit: () => void
}

/**
 * Builds this binder's per-instance page-list and active-page atoms, namespaced under its storage prefix so each
 * binder keeps an isolated set of pages.
 */
function makeBinderAtoms(prefix: string) {
    return {
        pagesAtom: atomWithStorage<Page[]>(`${prefix}:pages`, []),
        activePageAtom: atomWithStorage(`${prefix}:activePage`, ''),
    }
}

/** How far the page and tab strip are scaled, shared across binders and persisted to storage. */
const pageScaleAtom = atomWithStorage('pageScale', 1)

// How much each scale step changes the scale, and the smallest scale allowed.
const SCALE_STEP = 0.25
const MIN_SCALE = 0.45

/**
 * Resolves a page descriptor to its element: a character sheet bound to its binder-prefixed storage prefix, or the
 * labelled empty page.
 */
function renderPage(page: Page, storagePrefix: string): ReactNode {
    if (page.type === 'characterSheet') {
        return <CharacterSheet storagePrefix={`${storagePrefix}:${page.storagePrefix}`}/>
    }
    return <EmptyPage title={page.label}/>
}

/**
 * The whole page area of one binder: the active page beside the binder-tab strip, with controls to add pages and
 * return to the library.
 */
function Binder({storagePrefix, onExit}: BinderProps) {
    const {pagesAtom, activePageAtom} = useMemo(() => makeBinderAtoms(storagePrefix), [storagePrefix])
    const [pages, setPages] = useAtom(pagesAtom)
    const [activeId, setActiveId] = useAtom(activePageAtom)
    const [scale, setScale] = useAtom(pageScaleAtom)
    // The scaled wrapper, measured to keep the page from growing past the screen width.
    const viewRef = useRef<HTMLDivElement>(null)
    // The largest scale at which the page still fits the screen width, tracked from the wrapper's unscaled layout
    // width so it stays fresh as the viewport resizes; held 2% short of the edge to leave a sliver of margin.
    const [maxScale, setMaxScale] = useState(Infinity)
    const [adding, setAdding] = useState(false)
    // The last tab's element, watched so the back-to-top button appears once it scrolls out of view.
    const [lastTab, setLastTab] = useState<HTMLElement | null>(null)
    // Which edit dialogue is open for the active tab, if any.
    const [editing, setEditing] = useState<'edit' | 'delete' | null>(null)
    const activeIndex = Math.max(0, pages.findIndex((page) => page.id === activeId))
    const active = pages.length ? pages[activeIndex] : undefined

    // Recomputes the max scale from the wrapper's unscaled layout width whenever that width changes (viewport resize).
    useEffect(() => {
        const view = viewRef.current
        if (!view) return
        const update = () => setMaxScale((window.innerWidth / view.offsetWidth) * 0.98)
        update()
        const observer = new ResizeObserver(update)
        observer.observe(view)
        return () => observer.disconnect()
    }, [])

    // Enlarges the page and tabs by one step, stopping once they fill the screen width.
    function scaleUp() {
        setScale((prev) => Math.min(maxScale, Math.round((prev + SCALE_STEP) * 100) / 100))
    }

    // Shrinks the page and tabs by one step, down to the minimum scale.
    function scaleDown() {
        setScale((prev) => Math.max(MIN_SCALE, Math.round((prev - SCALE_STEP) * 100) / 100))
    }

    // Appends a new page of the chosen type; its GUID id doubles as the character-sheet storage prefix.
    function createPage(name: string, type: PageType) {
        const id = pageId()
        setPages([...pages, {id, label: name, type, storagePrefix: id, hue: tabHue(pages.length)}])
        setActiveId(id)
        setAdding(false)
    }

    // Edits the active tab's label and hue (its id and stored fields are unchanged).
    function editPage(label: string, hue: number) {
        setPages((prev) => prev.map((page) => (page.id === activeId ? {...page, label, hue} : page)))
        setEditing(null)
    }

    // Removes the active page, then activates its neighbour so a page stays selected when one remains.
    function deletePage() {
        const index = pages.findIndex((page) => page.id === activeId)
        const next = pages.filter((page) => page.id !== activeId)
        setPages(next)
        setActiveId(next.length ? next[Math.min(index, next.length - 1)].id : '')
        setEditing(null)
    }

    // Moves the page at index `from` to index `to`, persisting the new tab order.
    function reorderPages(from: number, to: number) {
        setPages((prev) => {
            const next = prev.slice()
            const [moved] = next.splice(from, 1)
            next.splice(to, 0, moved)
            return next
        })
    }

    return (
        <div className="app-shell" style={{'--active-hue': active?.hue ?? 0} as CSSProperties}>
            <div className="binder-view" ref={viewRef} style={{transform: `scale(${scale})`}}>
                <main className="page">{active ? renderPage(active, storagePrefix) : <EmptyPage/>}</main>
                <Tabs tabs={pages} activeId={active?.id ?? ''} onSelect={setActiveId} onReorder={reorderPages}
                      onLastTabChange={setLastTab}/>
            </div>
            <TabControls onAdd={() => setAdding(true)} hasActive={!!active} onEdit={() => setEditing('edit')}
                         onDelete={(event) => (event.shiftKey ? deletePage() : setEditing('delete'))} onExit={onExit}
                         lastTab={lastTab}/>
            <ViewControls onScaleUp={scaleUp} onScaleDown={scaleDown} canScaleUp={scale < maxScale}
                          canScaleDown={scale > MIN_SCALE}/>
            {adding && <AddTabModal onCreate={createPage} onCancel={() => setAdding(false)}/>}
            {active && editing === 'edit' && (
                <EditTabModal initialLabel={active.label} initialHue={active.hue} onSave={editPage}
                              onCancel={() => setEditing(null)}/>
            )}
            {active && editing === 'delete' && (
                <DeleteTabModal label={active.label} onConfirm={deletePage} onCancel={() => setEditing(null)}/>
            )}
        </div>
    )
}

export default Binder
