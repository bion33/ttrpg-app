import {useSyncExternalStore} from 'react'

/**
 * The visible region of the layout viewport under pinch-zoom and pan, as fixed-position CSS-pixel offsets and size.
 */
export interface VisualViewportRect {
    offsetLeft: number
    offsetTop: number
    width: number
    height: number
    scale: number
}

// A single cached rect compared field-by-field, so getSnapshot returns a stable reference until the viewport moves
// (useSyncExternalStore loops forever on a fresh object each read). The viewport is global, so one cache suffices.
let cached: VisualViewportRect | null = null

/**
 * The current visual viewport rectangle while `enabled`, re-read on pinch-zoom/pan; null when disabled or unsupported.
 */
export function useVisualViewportRect(enabled: boolean): VisualViewportRect | null {
    return useSyncExternalStore(
        (onChange) => subscribe(enabled, onChange),
        () => getSnapshot(enabled),
    )
}

function subscribe(enabled: boolean, onChange: () => void): () => void {
    const viewport = window.visualViewport
    if (!enabled || !viewport) return () => {}
    viewport.addEventListener('resize', onChange)
    viewport.addEventListener('scroll', onChange)
    return () => {
        viewport.removeEventListener('resize', onChange)
        viewport.removeEventListener('scroll', onChange)
    }
}

function getSnapshot(enabled: boolean): VisualViewportRect | null {
    const viewport = window.visualViewport
    if (!enabled || !viewport) return null
    if (cached
        && cached.offsetLeft === viewport.offsetLeft
        && cached.offsetTop === viewport.offsetTop
        && cached.width === viewport.width
        && cached.height === viewport.height
        && cached.scale === viewport.scale) {
        return cached
    }
    cached = {
        offsetLeft: viewport.offsetLeft,
        offsetTop: viewport.offsetTop,
        width: viewport.width,
        height: viewport.height,
        scale: viewport.scale,
    }
    return cached
}
