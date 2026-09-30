import type {CSSProperties, ReactNode} from 'react'
import {useEffect, useState} from 'react'
import {useAtom, useSetAtom} from 'jotai'
import './Binder.css'
import {useLocation, useNavigate} from '@hooks/useNavigation.ts'
import Tabs from './tabs/Tabs.tsx'
import AddTabModal from './tabs/modals/AddTabModal.tsx'
import TabControls from './tabs/TabControls.tsx'
import ViewControls from './ViewControls.tsx'
import EditTabModal from './tabs/modals/EditTabModal.tsx'
import ConfirmModal from '@ui/ConfirmModal/ConfirmModal'
import type {PageType} from './pageTypes.ts'
import type {Page} from './binderAtoms.ts'
import {activePageAtom, pagesAtom} from './binderAtoms.ts'
import {newId} from '@lib/ids/newId.ts'
import {tabHue} from '@lib/colors/tabHue.ts'
import {usePageScale} from '@hooks/usePageScale.ts'
import CharacterSheet from '@features/CharacterSheet/CharacterSheet'
import EmptyPage from '@features/EmptyPage/EmptyPage'
import StorageControls from '@features/Storage/StorageControls.tsx'

/**
 * Props for a binder: the storage prefix (its library id) all its pages persist under, and the callback that returns
 * to the library shelf.
 */
interface BinderProps {
    storagePrefix: string
    onExit: () => void
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
    const [pages, setPages] = useAtom(pagesAtom(storagePrefix))
    const location = useLocation()
    const navigate = useNavigate()
    const rememberActivePage = useSetAtom(activePageAtom(storagePrefix))
    const activeId = location.pageId
    const {scale, scaleUp, scaleDown, canScaleUp, canScaleDown, viewReference} = usePageScale()
    const [adding, setAdding] = useState(false)
    // The last tab's element, watched so the back-to-top button appears once it scrolls out of view.
    const [lastTab, setLastTab] = useState<HTMLElement | null>(null)
    // Which edit dialogue is open for the active tab, if any.
    const [editing, setEditing] = useState<'edit' | 'delete' | null>(null)
    const activeIndex = Math.max(0, pages.findIndex((page) => page.id === activeId))
    const active = pages.length ? pages[activeIndex] : undefined

    // Persists the shown page as this binder's remembered active page, so reopening it returns here.
    useEffect(() => rememberActivePage(activeId), [activeId, rememberActivePage])

    // Appends a new page of the chosen type; its GUID id doubles as the character-sheet storage prefix.
    function createPage(name: string, type: PageType) {
        const id = newId()
        setPages([...pages, {id, label: name, type, storagePrefix: id, hue: tabHue(pages.length)}])
        navigate({binderId: storagePrefix, pageId: id})
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
        navigate({binderId: storagePrefix, pageId: next.length ? next[Math.min(index, next.length - 1)].id : ''})
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
                <Tabs tabs={pages} activeId={active?.id ?? ''}
                      onSelect={(id) => navigate({binderId: storagePrefix, pageId: id})} onReorder={reorderPages}
                      onLastTabChange={setLastTab}/>
            </div>
            <TabControls onAdd={() => setAdding(true)} hasActive={!!active} onEdit={() => setEditing('edit')}
                         onDelete={(event) => (event.shiftKey ? deletePage() : setEditing('delete'))} onExit={onExit}
                         lastTab={lastTab}/>
            <StorageControls placement="binder"/>
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
