import type {CSSProperties} from 'react'
import {useEffect, useLayoutEffect, useRef, useState} from 'react'
import './Tabs.css'
import {tabColor} from '@lib/colors/hueColors.ts'
import {useDragReorder} from '@hooks/useDragReorder.ts'

// Vertical overlap between consecutive paper tabs, in rem — mirrors their negative top margin so the stacked strip
// height can be estimated.
const TAB_OVERLAP_REM = 0.5
// A paper tab's minimum height, in rem, used as the height estimate for a tab not yet measured in vertical mode.
const VERTICAL_MIN_TAB_REM = 4.8
// Fallback per-row step of the horizontal list, in rem, used for the add-tab capacity before a list row is measured.
const LIST_STEP_FALLBACK_REM = 2.3

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
    // Reports whether another tab would still fit beside the page, so the add-tab control can be disabled when full.
    onCanAddChange?: (canAdd: boolean) => void
}

/**
 * The binder's page tabs. While the rotated paper-tab strip fits the page height it shows as that strip, flush to the
 * page's right edge; once it would overflow it becomes a compact top-to-bottom list of horizontal tabs in the gutter
 * beside the page, labels truncated to fit. Either way tabs drag vertically to reorder, and the strip reports when the
 * list is full so adding is disabled.
 */
function Tabs({tabs, activeId, onSelect, onReorder, onLastTabChange, onCanAddChange}: TabsProps) {
    const navReference = useRef<HTMLElement | null>(null)
    const tabReferences = useRef<(HTMLButtonElement | null)[]>([])
    // Each tab's last measured paper-tab height, kept by id so the strip height can still be estimated while the list
    // (which does not render the paper tabs) is showing.
    const verticalHeights = useRef(new Map<string, number>())
    // The last measured per-row step of the horizontal list, reused for capacity while the list is not rendered.
    const listStep = useRef(0)
    const lastReportedCanAdd = useRef(true)
    // 'list' once the paper strip would overflow the page height; 'vertical' while it fits.
    const [mode, setMode] = useState<'vertical' | 'list'>('vertical')
    const {registerItem, startDrag, onPointerMove, onPointerUp, itemTransform, draggingIndex, committing}
        = useDragReorder(tabs.length, onReorder)

    // Reports the last tab's element up whenever the tab list changes, so a control can watch its visibility.
    useEffect(() => {
        onLastTabChange?.(tabReferences.current[tabs.length - 1] ?? null)
    }, [tabs.length, onLastTabChange])

    // Measures the tabs against the page height to choose the strip-vs-list mode and whether another tab still fits,
    // re-running on tab changes, on the mode flip, and whenever the page beside the strip changes size.
    useLayoutEffect(() => {
        const parent = navReference.current?.parentElement ?? null
        function measure() {
            const remPixels = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
            const available = parent?.clientHeight ?? 0
            if (mode === 'vertical') {
                tabs.forEach((tab, index) => {
                    const height = tabReferences.current[index]?.offsetHeight
                    if (height) verticalHeights.current.set(tab.id, height)
                })
            } else if (tabReferences.current[0] && tabReferences.current[1]) {
                listStep.current = tabReferences.current[1].offsetTop - tabReferences.current[0].offsetTop
            }
            // Estimate the stacked paper-strip height from the measured (or minimum) per-tab heights, less the overlap.
            const overlap = TAB_OVERLAP_REM * remPixels
            const minimum = VERTICAL_MIN_TAB_REM * remPixels
            const stripHeight = tabs.reduce((total, tab, index) => {
                const height = verticalHeights.current.get(tab.id) ?? minimum
                return total + (index === 0 ? height : height - overlap)
            }, 0)
            const nextMode = available > 0 && stripHeight > available ? 'list' : 'vertical'
            if (nextMode !== mode) setMode(nextMode)
            const step = listStep.current || LIST_STEP_FALLBACK_REM * remPixels
            const capacity = available > 0 ? Math.max(1, Math.floor(available / step)) : Number.POSITIVE_INFINITY
            const canAdd = tabs.length < capacity
            if (canAdd !== lastReportedCanAdd.current) {
                lastReportedCanAdd.current = canAdd
                onCanAddChange?.(canAdd)
            }
        }
        measure()
        if (!parent) return
        const observer = new ResizeObserver(measure)
        observer.observe(parent)
        return () => observer.disconnect()
    }, [tabs, mode, onCanAddChange])

    const navClass = mode === 'list' ? 'tab-list' : 'tabs'
    return (
        <nav className={`${navClass} no-print`} aria-label="Pages" ref={navReference}>
            {tabs.map((tab, index) => (
                <button
                    key={tab.id}
                    ref={(element) => {
                        tabReferences.current[index] = element
                        registerItem(index)(element)
                    }}
                    type="button"
                    className={`${navClass}__tab${tab.id === activeId ? ` ${navClass}__tab--active` : ''}`}
                    style={{
                        '--hue': tab.hue,
                        '--tab-color': tabColor(tab.hue),
                        // The dragged tab rides above everything; the active tab sits over the page (z 10) so it can
                        // cover the border; among inactive tabs earlier ones stack over later ones.
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
                    <span className={`${navClass}__label`}>{tab.label}</span>
                </button>
            ))}
        </nav>
    )
}

export default Tabs
