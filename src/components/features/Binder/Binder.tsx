import type {CSSProperties, ReactNode} from 'react'
import {useMemo, useState} from 'react'
import {useAtom} from 'jotai'
import {atomWithStorage} from 'jotai/utils'
import './Binder.css'
import Tabs, {type TabItem} from './tabs/Tabs.tsx'
import AddTabModal from './tabs/modals/AddTabModal.tsx'
import TabControls from './tabs/TabControls.tsx'
import ViewControls from './ViewControls.tsx'
import EditTabModal from './tabs/modals/EditTabModal.tsx'
import ConfirmModal from '../../ui/ConfirmModal/ConfirmModal'
import type {PageType} from './pageTypes.ts'
import {pageId} from './logic/pageId.ts'
import {tabHue} from '../../../lib/tabHue.ts'
import {usePageScale} from '../../../hooks/usePageScale.ts'
import CharacterSheet from '../CharacterSheet/CharacterSheet'
import EmptyPage from '../EmptyPage/EmptyPage'

/**
 * A navigable page persisted to storage: tab metadata, its `type` (which component renders it), and the storage
 * prefix a character sheet's fields persist under (within its binder's namespace).
 */
type Page = TabItem & { type: PageType; storagePrefix: string }

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
    const {scale, scaleUp, scaleDown, canScaleUp, canScaleDown, viewReference} = usePageScale()
    const [adding, setAdding] = useState(false)
    // The last tab's element, watched so the back-to-top button appears once it scrolls out of view.
    const [lastTab, setLastTab] = useState<HTMLElement | null>(null)
    // Which edit dialogue is open for the active tab, if any.
    const [editing, setEditing] = useState<'edit' | 'delete' | null>(null)
    const activeIndex = Math.max(0, pages.findIndex((page) => page.id === activeId))
    const active = pages.length ? pages[activeIndex] : undefined

    // Appends a new page of the chosen type; its GUID id doubles as the character-sheet storage prefix.
    function createPage(name: string, type: PageType) {
        const id = pageId()
        setPages([...pages, {id, label: name, type, storagePrefix: id, hue: tabHue(pages.length)}])
        setActiveId(id)
        setAdding(false)
    }

    // Edits the active tab's label and hue (its id and stored fields are unchanged).
    function editPage(label: string, hue: number) {
        setPages((previous) => previous.map((page) => (page.id === activeId ? {...page, label, hue} : page)))
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
        setPages((previous) => {
            const next = previous.slice()
            const [moved] = next.splice(from, 1)
            next.splice(to, 0, moved)
            return next
        })
    }

    return (
        <div className="app-shell" style={{'--active-hue': active?.hue ?? 0} as CSSProperties}>
            <div className="binder-view" ref={viewReference} style={{transform: `scale(${scale})`}}>
                <main className="page">{active ? renderPage(active, storagePrefix) : <EmptyPage/>}</main>
                <Tabs tabs={pages} activeId={active?.id ?? ''} onSelect={setActiveId} onReorder={reorderPages}
                      onLastTabChange={setLastTab}/>
            </div>
            <TabControls onAdd={() => setAdding(true)} hasActive={!!active} onEdit={() => setEditing('edit')}
                         onDelete={(event) => (event.shiftKey ? deletePage() : setEditing('delete'))} onExit={onExit}
                         lastTab={lastTab}/>
            <ViewControls onScaleUp={scaleUp} onScaleDown={scaleDown} canScaleUp={canScaleUp}
                          canScaleDown={canScaleDown}/>
            {adding && <AddTabModal onCreate={createPage} onCancel={() => setAdding(false)}/>}
            {active && editing === 'edit' && (
                <EditTabModal initialLabel={active.label} initialHue={active.hue} onSave={editPage}
                              onCancel={() => setEditing(null)}/>
            )}
            {active && editing === 'delete' && (
                <ConfirmModal
                    title="Delete tab"
                    message={`Delete “${active.label}”? This page and everything saved on it will be removed, which cannot be undone.`}
                    confirmLabel="Delete"
                    variant="danger"
                    onConfirm={deletePage}
                    onCancel={() => setEditing(null)}
                />
            )}
        </div>
    )
}

export default Binder
