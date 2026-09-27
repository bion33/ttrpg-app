import type {ReactNode} from 'react'
import {useAtom} from 'jotai'
import {atomWithStorage} from 'jotai/utils'
import './Pages.css'
import VerticalTabs, {type TabItem} from '../../ui/VerticalTabs/VerticalTabs'
import {tabHue} from '../../ui/VerticalTabs/tabHue.ts'
import CharacterSheet from '../CharacterSheet/CharacterSheet'
import PlaceholderPage from '../PlaceholderPage/PlaceholderPage'

/**
 * A navigable page persisted to storage: just its tab metadata (the rendered element is resolved by id).
 */
type Page = TabItem

/** The pages present on a fresh install: only the character sheet. */
const DEFAULT_PAGES: Page[] = [{id: 'stats', label: 'stats'}]

/** The user's page list, loaded from and persisted to storage. */
const pagesAtom = atomWithStorage<Page[]>('pages', DEFAULT_PAGES)

const activePageAtom = atomWithStorage('activePage', DEFAULT_PAGES[0].id)

/**
 * Resolves a page descriptor to its element: the STATS page is the character sheet, every other id is a placeholder.
 */
function renderPage(page: Page): ReactNode {
    if (page.id === 'stats') return <CharacterSheet/>
    return <PlaceholderPage title={page.label}/>
}

/**
 * The whole page area: the active page beside the binder-tab strip, with a "+" tab that appends a new page.
 */
function Pages() {
    const [pages, setPages] = useAtom(pagesAtom)
    const [activeId, setActiveId] = useAtom(activePageAtom)
    const activeIndex = Math.max(0, pages.findIndex((page) => page.id === activeId))
    const active = pages[activeIndex]

    // Appends a new placeholder page named by the user and makes it active.
    function addPage() {
        const label = window.prompt('Page name')?.trim()
        if (!label) return
        const id = `page-${Date.now().toString(36)}`
        setPages([...pages, {id, label}])
        setActiveId(id)
    }

    return (
        <div className="app-shell" style={{'--active-hue': tabHue(activeIndex)} as React.CSSProperties}>
            <main className="page">{renderPage(active)}</main>
            <VerticalTabs tabs={pages} activeId={active.id} onSelect={setActiveId} onAdd={addPage}/>
        </div>
    )
}

export default Pages
