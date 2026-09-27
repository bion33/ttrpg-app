import type {CSSProperties, ReactNode} from 'react'
import {useState} from 'react'
import {useAtom} from 'jotai'
import {atomWithStorage} from 'jotai/utils'
import './Binder.css'
import Tabs, {type TabItem} from './Tabs.tsx'
import AddPageModal from './AddPageModal.tsx'
import TabControls from './TabControls.tsx'
import {ColorTabModal, DeleteTabModal, RenameTabModal} from './TabDialogs.tsx'
import type {PageType} from './pageTypes.ts'
import {tabHue} from './logic/tabHue.ts'
import {pageId} from './logic/pageId.ts'
import CharacterSheet from '../CharacterSheet/CharacterSheet'
import EmptyPage from '../EmptyPage/EmptyPage'

/**
 * A navigable page persisted to storage: tab metadata, its `type` (which component renders it), and the storage
 * prefix a character sheet's fields persist under.
 */
type Page = TabItem & {type: PageType; storagePrefix: string}

/** The user's page list, loaded from and persisted to storage. Empty until the user adds a page. */
const pagesAtom = atomWithStorage<Page[]>('pages', [])

const activePageAtom = atomWithStorage('activePage', '')

/**
 * Resolves a page descriptor to its element: a character sheet bound to its storage prefix, or the labelled empty page.
 */
function renderPage(page: Page): ReactNode {
    if (page.type === 'characterSheet') return <CharacterSheet storagePrefix={page.storagePrefix}/>
    return <EmptyPage title={page.label}/>
}

/**
 * The whole page area: the active page beside the binder-tab strip, with a "+" tab that opens the add-page dialog.
 */
function Binder() {
    const [pages, setPages] = useAtom(pagesAtom)
    const [activeId, setActiveId] = useAtom(activePageAtom)
    const [adding, setAdding] = useState(false)
    // Which edit dialogue is open for the active tab, if any.
    const [editing, setEditing] = useState<'rename' | 'color' | 'delete' | null>(null)
    const activeIndex = Math.max(0, pages.findIndex((page) => page.id === activeId))
    const active = pages.length ? pages[activeIndex] : undefined

    // Appends a new page of the chosen type; its GUID id doubles as the character-sheet storage prefix.
    function createPage(name: string, type: PageType) {
        const id = pageId()
        setPages([...pages, {id, label: name, type, storagePrefix: id, hue: tabHue(pages.length)}])
        setActiveId(id)
        setAdding(false)
    }

    // Renames the active tab (label only; its id and stored fields are unchanged).
    function renamePage(label: string) {
        setPages((prev) => prev.map((page) => (page.id === activeId ? {...page, label} : page)))
        setEditing(null)
    }

    // Recolours the active tab.
    function recolorPage(hue: number) {
        setPages((prev) => prev.map((page) => (page.id === activeId ? {...page, hue} : page)))
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
            <main className="page">{active ? renderPage(active) : <EmptyPage/>}</main>
            <Tabs tabs={pages} activeId={active?.id ?? ''} onSelect={setActiveId} onReorder={reorderPages}/>
            <TabControls onAdd={() => setAdding(true)} hasActive={!!active} onRename={() => setEditing('rename')}
                         onRecolor={() => setEditing('color')} onDelete={() => setEditing('delete')}/>
            {adding && <AddPageModal onCreate={createPage} onCancel={() => setAdding(false)}/>}
            {active && editing === 'rename' && (
                <RenameTabModal initial={active.label} onSave={renamePage} onCancel={() => setEditing(null)}/>
            )}
            {active && editing === 'color' && (
                <ColorTabModal initial={active.hue} onSave={recolorPage} onCancel={() => setEditing(null)}/>
            )}
            {active && editing === 'delete' && (
                <DeleteTabModal label={active.label} onConfirm={deletePage} onCancel={() => setEditing(null)}/>
            )}
        </div>
    )
}

export default Binder
