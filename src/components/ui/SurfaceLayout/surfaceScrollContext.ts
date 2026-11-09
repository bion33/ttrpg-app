import {createContext, useContext} from 'react'

/**
 * The surface's vertical scroll pane element, so controls in the layout (e.g. back-to-top, a scroll-position observer)
 * can act on the pane that actually scrolls rather than the window.
 */
const SurfaceScrollContext = createContext<HTMLElement | null>(null)

export default SurfaceScrollContext

/**
 * The current surface scroll pane, or null outside a SurfaceLayout or before it has mounted.
 */
export function useSurfaceScroll(): HTMLElement | null {
    return useContext(SurfaceScrollContext)
}
