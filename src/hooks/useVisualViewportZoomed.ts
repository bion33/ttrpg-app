import {useEffect, useState} from 'react'

// Ignore scales a hair above 1 (sub-pixel noise, trivial zoom) so the flag only flips for a real pinch, where the
// collision math below is meaningfully wrong.
const ZOOMED_THRESHOLD = 1.01

/**
 * Whether the browser's native pinch-zoom is currently magnifying the page (the visual viewport is zoomed in past 1x).
 *
 * Portalled popovers are positioned by collision middleware that measures their unscaled layout box; under pinch-zoom
 * the on-screen counter-scale makes that box the wrong size, so a consumer can disable collision avoidance while this
 * is true and keep the popover anchored to its trigger instead.
 */
export function useVisualViewportZoomed(): boolean {
    const [zoomed, setZoomed] = useState(false)
    useEffect(() => {
        const viewport = window.visualViewport
        if (!viewport) return

        // Only toggles state when the zoomed/unzoomed verdict actually changes, so a pinch-pan doesn't re-render.
        const read = () => setZoomed(viewport.scale > ZOOMED_THRESHOLD)
        read()
        viewport.addEventListener('resize', read)
        viewport.addEventListener('scroll', read)
        return () => {
            viewport.removeEventListener('resize', read)
            viewport.removeEventListener('scroll', read)
        }
    }, [])
    return zoomed
}
