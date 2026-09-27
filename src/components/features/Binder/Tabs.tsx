import {Plus} from 'lucide-react'
import {useRef, useState} from 'react'
import './Tabs.css'
import {tabHue} from './logic/tabHue.ts'

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
interface TabsProps {
    tabs: TabItem[]
    activeId: string
    onSelect: (id: string) => void
    // Invoked by the trailing "+" tab to request a new page.
    onAdd: () => void
    // Commits a drag reorder: the tab at index `from` moves to index `to`.
    onReorder: (from: number, to: number) => void
}

/**
 * Mutable per-drag bookkeeping read only inside pointer handlers: the origin slot, the pointer origin, the tab tops
 * captured at drag start, and the live target slot.
 */
interface DragState {
    fromIndex: number
    startY: number
    tops: number[]
    target: number
}

/**
 * Vertical, right-aligned tab strip styled like coloured paper binder tabs, with each label rotated 90° CCW; tabs
 * can be dragged vertically to reorder, with the displaced tabs sliding to their new slots.
 */
function Tabs({tabs, activeId, onSelect, onAdd, onReorder}: TabsProps) {
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
    const dragRef = useRef<DragState | null>(null)
    // Render-facing drag state: the moving tab, its origin slot, the captured tops, its live offset and target slot.
    const [drag, setDrag] = useState<{id: string; fromIndex: number; tops: number[]} | null>(null)
    const [dragOffset, setDragOffset] = useState(0)
    const [target, setTarget] = useState(0)

    // Begins dragging a tab, capturing the pointer and each tab's current top.
    function onPointerDown(event: React.PointerEvent<HTMLButtonElement>, index: number, id: string) {
        if (event.button !== 0) return
        const tops = tabRefs.current.slice(0, tabs.length).map((el) => el?.offsetTop ?? 0)
        dragRef.current = {fromIndex: index, startY: event.clientY, tops, target: index}
        setDrag({id, fromIndex: index, tops})
        setDragOffset(0)
        setTarget(index)
        event.currentTarget.setPointerCapture(event.pointerId)
    }

    // Tracks the pointer: moves the dragged tab and recomputes which slot it would drop into.
    function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
        const state = dragRef.current
        if (!state) return
        const dy = event.clientY - state.startY
        setDragOffset(dy)
        const height = tabRefs.current[state.fromIndex]?.offsetHeight ?? 0
        const draggedCenter = state.tops[state.fromIndex] + dy + height / 2
        // The new index is the count of other tabs whose centre sits above the dragged tab's centre.
        let ti = 0
        for (let k = 0; k < tabs.length; k++) {
            if (k === state.fromIndex) continue
            const center = state.tops[k] + (tabRefs.current[k]?.offsetHeight ?? 0) / 2
            if (draggedCenter > center) ti++
        }
        state.target = ti
        setTarget(ti)
    }

    // Ends the drag, committing the reorder when the tab settled in a new slot.
    function onPointerUp() {
        const state = dragRef.current
        if (!state) return
        dragRef.current = null
        if (state.target !== state.fromIndex) onReorder(state.fromIndex, state.target)
        setDrag(null)
        setDragOffset(0)
    }

    // The translateY applied to a tab during a drag: the dragged tab follows the pointer, displaced tabs shift a slot.
    function tabTransform(index: number): string | undefined {
        if (!drag) return undefined
        if (tabs[index].id === drag.id) return `translateY(${dragOffset}px)`
        const {fromIndex, tops} = drag
        if (target > fromIndex && index > fromIndex && index <= target) {
            return `translateY(${tops[index - 1] - tops[index]}px)`
        }
        if (target < fromIndex && index >= target && index < fromIndex) {
            return `translateY(${tops[index + 1] - tops[index]}px)`
        }
        return 'translateY(0)'
    }

    return (
        <nav className="tabs" aria-label="Pages">
            {tabs.map((tab, index) => (
                <button
                    key={tab.id}
                    ref={(el) => {
                        tabRefs.current[index] = el
                    }}
                    type="button"
                    className={`tabs__tab${tab.id === activeId ? ' tabs__tab--active' : ''}`}
                    style={{
                        '--hue': tabHue(index),
                        // The dragged tab rides above everything; otherwise the active tab (over the page at z 10)
                        // notches the border, and among inactive tabs earlier ones stack over later ones.
                        zIndex: tab.id === drag?.id ? 200 : tab.id === activeId ? 100 : tabs.length - index,
                        transform: tabTransform(index),
                        // The dragged tab tracks the pointer with no easing; the displaced tabs keep the CSS glide.
                        transition: tab.id === drag?.id ? 'none' : undefined,
                    } as React.CSSProperties}
                    aria-current={tab.id === activeId ? 'page' : undefined}
                    onPointerDown={(event) => onPointerDown(event, index, tab.id)}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onClick={() => onSelect(tab.id)}
                >
                    <span className="tabs__label">{tab.label}</span>
                </button>
            ))}
            <button
                type="button"
                className="tabs__tab tabs__tab--add"
                style={{zIndex: 0} as React.CSSProperties}
                aria-label="Add tab"
                title="Add tab"
                onClick={onAdd}
            >
                <Plus className="tabs__add-icon" aria-hidden="true"/>
            </button>
        </nav>
    )
}

export default Tabs
