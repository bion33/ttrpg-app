import type {PointerEvent} from 'react'
import {useEffect, useRef, useState} from 'react'

// Pixels the dragged item may overshoot the last slot, so it lifts slightly clear of the list's bottom edge.
const EDGE_SLACK = 2

/**
 * Mutable per-drag bookkeeping read only inside pointer handlers: the origin slot, the pointer origin, the item tops
 * captured at drag start, the live target slot, and the view's on-screen scale (to convert screen-pixel deltas).
 */
interface DragReference {
    fromIndex: number
    startY: number
    tops: number[]
    target: number
    scale: number
}

/**
 * The reorder-drag controls a caller wires into a vertical list: a ref registrar, the pointer handlers that drive one
 * drag, and the per-item transform plus flags a row needs to follow the pointer and glide to its new slot.
 */
export interface DragReorder {
    registerItem: (index: number) => (element: HTMLElement | null) => void
    startDrag: (event: PointerEvent<HTMLElement>, index: number) => void
    onPointerMove: (event: PointerEvent<HTMLElement>) => void
    onPointerUp: () => void
    itemTransform: (index: number) => string | undefined
    // The slot being dragged, or null when idle; its row rides the pointer and should suppress its glide.
    draggingIndex: number | null
    // True for the single commit frame after a drop, while rows snap to their reordered slots without gliding.
    committing: boolean
}

/**
 * Pointer-driven vertical reordering for a list of `count` items: the grabbed row follows the pointer while the
 * displaced rows glide to their new slots, committing the move through `onReorder` when it settles in a new slot.
 */
export function useDragReorder(count: number, onReorder: (from: number, to: number) => void): DragReorder {
    const elementReferences = useRef<(HTMLElement | null)[]>([])
    const dragReference = useRef<DragReference | null>(null)
    const [drag, setDrag] = useState<{fromIndex: number; tops: number[]} | null>(null)
    const [dragOffset, setDragOffset] = useState(0)
    const [target, setTarget] = useState(0)
    const [committing, setCommitting] = useState(false)

    // Re-enables the glide once the reorder has painted, so the snap-to-new-slot frame is not itself animated.
    useEffect(() => {
        if (!committing) return
        const frame = requestAnimationFrame(() => setCommitting(false))
        return () => cancelAnimationFrame(frame)
    }, [committing])

    function registerItem(index: number) {
        return (element: HTMLElement | null) => {
            elementReferences.current[index] = element
        }
    }

    // Begins dragging the item at `index`, capturing the pointer and each item's current top.
    function startDrag(event: PointerEvent<HTMLElement>, index: number) {
        if (event.button !== 0) return
        const tops = elementReferences.current.slice(0, count).map((element) => element?.offsetTop ?? 0)
        // Derive the view's scale from the grabbed element's rendered vs. layout height so the drag tracks when zoomed.
        const element = event.currentTarget
        const scale = element.offsetHeight ? element.getBoundingClientRect().height / element.offsetHeight : 1
        dragReference.current = {fromIndex: index, startY: event.clientY, tops, target: index, scale}
        setDrag({fromIndex: index, tops})
        setDragOffset(0)
        setTarget(index)
        element.setPointerCapture(event.pointerId)
    }

    // Tracks the pointer: moves the dragged item and recomputes which slot it would drop into.
    function onPointerMove(event: PointerEvent<HTMLElement>) {
        const state = dragReference.current
        if (!state) return
        // Convert the screen-pixel pointer delta into the view's unscaled units so the item stays under the pointer.
        const pointerDelta = (event.clientY - state.startY) / state.scale
        const height = elementReferences.current[state.fromIndex]?.offsetHeight ?? 0
        // Clamp the offset so the dragged item cannot extend past the first and last slots — the reorderable span —
        // bar a few pixels of slack at the bottom so it is not pinned flush to the last edge.
        const lastIndex = count - 1
        const lastHeight = elementReferences.current[lastIndex]?.offsetHeight ?? 0
        const minOffset = state.tops[0] - state.tops[state.fromIndex]
        const maxOffset = state.tops[lastIndex] + lastHeight - (state.tops[state.fromIndex] + height) + EDGE_SLACK
        const deltaY = Math.min(Math.max(pointerDelta, minOffset), maxOffset)
        setDragOffset(deltaY)
        const draggedTop = state.tops[state.fromIndex] + deltaY
        const draggedBottom = draggedTop + height
        // The new index is the count of other items the dragged item sits past. Its leading edge in the travel
        // direction is tested against each centre — bottom edge for items below, top edge for items above — so a tall
        // item can overtake a shorter one without its centre having to clear the shorter item's centre.
        let targetIndex = 0
        for (let i = 0; i < count; i++) {
            if (i === state.fromIndex) continue
            const center = state.tops[i] + (elementReferences.current[i]?.offsetHeight ?? 0) / 2
            const leadingEdge = i < state.fromIndex ? draggedTop : draggedBottom
            if (leadingEdge > center) targetIndex++
        }
        state.target = targetIndex
        setTarget(targetIndex)
    }

    // Ends the drag, committing the reorder when the item settled in a new slot.
    function onPointerUp() {
        const state = dragReference.current
        if (!state) return
        dragReference.current = null
        if (state.target !== state.fromIndex) {
            onReorder(state.fromIndex, state.target)
            setCommitting(true)
        }
        setDrag(null)
        setDragOffset(0)
    }

    // The translateY applied to an item during a drag: the dragged item follows the pointer, displaced items shift.
    function itemTransform(index: number): string | undefined {
        if (!drag) return undefined
        if (index === drag.fromIndex) return `translateY(${dragOffset}px)`
        const {fromIndex, tops} = drag
        if (target > fromIndex && index > fromIndex && index <= target) {
            return `translateY(${tops[index - 1] - tops[index]}px)`
        }
        if (target < fromIndex && index >= target && index < fromIndex) {
            return `translateY(${tops[index + 1] - tops[index]}px)`
        }
        return 'translateY(0)'
    }

    return {
        registerItem,
        startDrag,
        onPointerMove,
        onPointerUp,
        itemTransform,
        draggingIndex: drag?.fromIndex ?? null,
        committing,
    }
}
