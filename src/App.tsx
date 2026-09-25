import type {ReactNode} from 'react'
import {useAtom} from 'jotai'
import {atomWithStorage} from 'jotai/utils'
import './App.css'
import CharacterSheet from './components/features/CharacterSheet/CharacterSheet'
import PlaceholderPage from './components/features/PlaceholderPage/PlaceholderPage'
import VerticalTabs, {type TabItem} from './components/ui/VerticalTabs/VerticalTabs'
import {tabHue} from './components/ui/VerticalTabs/tabHue.ts'

/**
 * One navigable page: its tab metadata plus the element rendered when the tab is active.
 */
interface Page extends TabItem {
    render: () => ReactNode
}

const PAGES: Page[] = [
    {id: 'stats', label: 'Stats', render: () => <CharacterSheet/>},
    {id: 'description', label: 'Description', render: () => <PlaceholderPage title="Description"/>},
    {id: 'equipment', label: 'Equipment', render: () => <PlaceholderPage title="Equipment"/>},
    {id: 'spells', label: 'Spells', render: () => <PlaceholderPage title="Spells"/>},
]

const activePageAtom = atomWithStorage('activePage', PAGES[0].id)

/**
 * Application root; renders the active page with the vertical binder-tab navigation.
 */
function App() {
    const [activeId, setActiveId] = useAtom(activePageAtom)
    const activeIndex = Math.max(0, PAGES.findIndex((page) => page.id === activeId))
    const active = PAGES[activeIndex]

    return (
        <div className="app-shell" style={{'--active-hue': tabHue(activeIndex)} as React.CSSProperties}>
            <main className="page">{active.render()}</main>
            <VerticalTabs tabs={PAGES} activeId={active.id} onSelect={setActiveId}/>
        </div>
    )
}

export default App
