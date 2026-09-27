import type {CSSProperties, ReactNode} from 'react'
import {useState} from 'react'
import {useAtom} from 'jotai'
import {atomWithStorage} from 'jotai/utils'
import './Binder.css'
import Tabs, {type TabItem} from './Tabs.tsx'
import AddPageModal from './AddPageModal.tsx'
import type {PageType} from './pageTypes.ts'
import {tabHue} from './logic/tabHue.ts'
import {uniqueId} from './logic/pageId.ts'
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
    const activeIndex = Math.max(0, pages.findIndex((page) => page.id === activeId))
    const active = pages.length ? pages[activeIndex] : undefined

    // Appends a new page of the chosen type, its id (and character-sheet storage prefix) derived from the name.
    function createPage(name: string, type: PageType) {
        const id = uniqueId(name, pages.map((page) => page.id))
        setPages([...pages, {id, label: name, type, storagePrefix: id, hue: tabHue(pages.length)}])
        setActiveId(id)
        setAdding(false)
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
            <Tabs tabs={pages} activeId={active?.id ?? ''} onSelect={setActiveId} onAdd={() => setAdding(true)}
                  onReorder={reorderPages}/>
            {adding && <AddPageModal onCreate={createPage} onCancel={() => setAdding(false)}/>}
        </div>
    )
}

export default Binder
