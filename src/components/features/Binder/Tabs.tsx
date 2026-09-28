import type {CSSProperties, PointerEvent} from 'react'
import {useEffect, useRef, useState} from 'react'
import './Tabs.css'

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
    onLastTabChange?: (el: HTMLElement | null) => void
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
function Tabs({tabs, activeId, onSelect, onReorder, onLastTabChange}: TabsProps) {
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
    const dragRef = useRef<DragState | null>(null)
    // Render-facing drag state: the moving tab, its origin slot, the captured tops, its live offset and target slot.
    const [drag, setDrag] = useState<{id: string; fromIndex: number; tops: number[]} | null>(null)
    const [dragOffset, setDragOffset] = useState(0)
    const [target, setTarget] = useState(0)
    // True for the single commit frame after a drop, while tabs snap to their reordered slots without gliding.
    const [committing, setCommitting] = useState(false)

    // Reports the last tab's element up whenever the tab list changes, so a control can watch its visibility.
    useEffect(() => {
        onLastTabChange?.(tabRefs.current[tabs.length - 1] ?? null)
    }, [tabs.length, onLastTabChange])

    // Re-enables the glide once the reorder has painted, so the snap-to-new-slot frame is not itself animated.
    useEffect(() => {
        if (!committing) return
        const frame = requestAnimationFrame(() => setCommitting(false))
        return () => cancelAnimationFrame(frame)
    }, [committing])

    // Begins dragging a tab, capturing the pointer and each tab's current top.
    function onPointerDown(event: PointerEvent<HTMLButtonElement>, index: number, id: string) {
        if (event.button !== 0) return
        const tops = tabRefs.current.slice(0, tabs.length).map((el) => el?.offsetTop ?? 0)
        dragRef.current = {fromIndex: index, startY: event.clientY, tops, target: index}
        setDrag({id, fromIndex: index, tops})
        setDragOffset(0)
        setTarget(index)
        event.currentTarget.setPointerCapture(event.pointerId)
    }

    // Tracks the pointer: moves the dragged tab and recomputes which slot it would drop into.
    function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
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
        if (state.target !== state.fromIndex) {
            onReorder(state.fromIndex, state.target)
            setCommitting(true)
        }
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
                        '--hue': tab.hue,
                        // The dragged tab rides above everything; otherwise the active tab (over the page at z 10)
                        // notches the border, and among inactive tabs earlier ones stack over later ones.
                        zIndex: tab.id === drag?.id ? 200 : tab.id === activeId ? 100 : tabs.length - index,
                        transform: tabTransform(index),
                        // The dragged tab tracks the pointer with no easing, and on drop every tab snaps to its
                        // reordered slot for one frame without gliding; otherwise displaced tabs keep the CSS glide.
                        transition: tab.id === drag?.id || committing ? 'none' : undefined,
                    } as CSSProperties}
                    aria-current={tab.id === activeId ? 'page' : undefined}
                    onPointerDown={(event) => onPointerDown(event, index, tab.id)}
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
