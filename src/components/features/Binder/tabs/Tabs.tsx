import type {CSSProperties} from 'react'
import {useEffect, useRef} from 'react'
import './Tabs.css'
import {tabColor} from '@lib/colors/hueColors.ts'
import {useDragReorder} from '@hooks/useDragReorder.ts'

/**
 * One selectable tab: its stable key and the label shown on the rotated paper tab.
 */
export interface TabItem {
    id: string
    label: string
    // Paper-tab hue (degrees), fixed when the page is created so it survives reordering.
    hue: number
}

/**
 * Props for the vertical binder-style tab strip.
 */
interface TabsProps {
    tabs: TabItem[]
    activeId: string
    onSelect: (id: string) => void
    // Commits a drag reorder: the tab at index `from` moves to index `to`.
    onReorder: (from: number, to: number) => void
    // Reports the last tab's element (or null) so an outside control can watch whether it has scrolled into view.
    onLastTabChange?: (element: HTMLElement | null) => void
}

/**
 * Vertical, right-aligned tab strip styled like coloured paper binder tabs, with each label rotated 90° CCW; tabs
 * can be dragged vertically to reorder, with the displaced tabs sliding to their new slots.
 */
function Tabs({tabs, activeId, onSelect, onReorder, onLastTabChange}: TabsProps) {
    const tabReferences = useRef<(HTMLButtonElement | null)[]>([])
    const {registerItem, startDrag, onPointerMove, onPointerUp, itemTransform, draggingIndex, committing}
        = useDragReorder(tabs.length, onReorder)

    // Reports the last tab's element up whenever the tab list changes, so a control can watch its visibility.
    useEffect(() => {
        onLastTabChange?.(tabReferences.current[tabs.length - 1] ?? null)
    }, [tabs.length, onLastTabChange])

    return (
        <nav className="tabs no-print" aria-label="Pages">
            {tabs.map((tab, index) => (
                <button
                    key={tab.id}
                    ref={(element) => {
                        tabReferences.current[index] = element
                        registerItem(index)(element)
                    }}
                    type="button"
                    className={`tabs__tab${tab.id === activeId ? ' tabs__tab--active' : ''}`}
                    style={{
                        '--hue': tab.hue,
                        '--tab-color': tabColor(tab.hue),
                        // The dragged tab rides above everything; otherwise the active tab (over the page at z 10)
                        // notches the border, and among inactive tabs earlier ones stack over later ones.
                        zIndex: index === draggingIndex ? 200 : tab.id === activeId ? 100 : tabs.length - index,
                        transform: itemTransform(index),
                        // The dragged tab tracks the pointer with no easing, and on drop every tab snaps to its
                        // reordered slot for one frame without gliding; otherwise displaced tabs keep the CSS glide.
                        transition: index === draggingIndex || committing ? 'none' : undefined,
                    } as CSSProperties}
                    aria-current={tab.id === activeId ? 'page' : undefined}
                    onPointerDown={(event) => startDrag(event, index)}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onClick={() => onSelect(tab.id)}
                >
                    <span className="tabs__label">{tab.label}</span>
                </button>
            ))}
        </nav>
    )
}

export default Tabs
