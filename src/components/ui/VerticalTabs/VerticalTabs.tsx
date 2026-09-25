import './VerticalTabs.css'
import {tabHue} from './tabHue.ts'

/**
 * One selectable tab: its stable key and the label shown on the rotated paper tab.
 */
export interface TabItem {
    id: string
    label: string
}

/**
 * Props for the vertical binder-style tab strip.
 */
interface VerticalTabsProps {
    tabs: TabItem[]
    activeId: string
    onSelect: (id: string) => void
}

/**
 * Vertical, right-aligned tab strip styled like coloured paper binder tabs, with each label rotated 90° CCW.
 */
function VerticalTabs({tabs, activeId, onSelect}: VerticalTabsProps) {
    return (
        <nav className="vertical-tabs" aria-label="Pages">
            {tabs.map((tab, index) => (
                <button
                    key={tab.id}
                    type="button"
                    className={`vertical-tabs__tab${tab.id === activeId ? ' vertical-tabs__tab--active' : ''}`}
                    style={{
                        '--hue': tabHue(index),
                        // Active tab lifts above the page (.page is z 10) so it notches the border; inactive tabs
                        // stay below the page, and among themselves earlier tabs stack over later ones.
                        zIndex: tab.id === activeId ? 100 : tabs.length - index,
                    } as React.CSSProperties}
                    aria-current={tab.id === activeId ? 'page' : undefined}
                    onClick={() => onSelect(tab.id)}
                >
                    <span className="vertical-tabs__label">{tab.label}</span>
                </button>
            ))}
        </nav>
    )
}

export default VerticalTabs
