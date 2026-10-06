import {useEffect} from 'react'

// How long the visual viewport must stay quiet (no scroll/resize events) before we treat the gesture as finished and
// reposition. Long enough to ride out the event stream of a pinch-pan or momentum scroll, short enough to feel prompt.
const SETTLE_MS = 120

// Mobile browsers restore the previous session's pinch-zoom shortly after load without firing a visual-viewport event,
// so the metrics we read at mount are stale. We re-read over this window to catch the restore once it lands.
const RESTORE_SETTLE_MS = 1500
const RESTORE_POLL_MS = 150

/**
 * Publishes the visual viewport's inset and zoom as CSS custom properties on the document root, so fixed chrome (the
 * corner-cluster controls) can anchor to what's actually visible rather than to the layout viewport.
 *
 * `position: fixed` anchors to the layout viewport. On desktop that matches the screen, but mobile pinch-zoom leaves
 * the layout viewport unchanged and shows a smaller, pannable sub-rectangle (the visual viewport) — so fixed corners
 * drift off the visible area. These variables give the gap on each side between the layout viewport and the visible
 * rectangle, plus the inverse zoom, letting the controls follow the visible corners and keep a constant on-screen size.
 *
 * We deliberately reposition only once the gesture settles, not on every event. The browser composites a pinch-pan on
 * its own thread and paints it immediately, so a JS-driven reposition always lands a frame behind and visibly jitters
 * against the moving content. Instead the controls are left alone mid-gesture (they pan with the view, briefly sliding
 * off-screen) and snapped to the visible corners in a single write once the viewport goes quiet; a CSS transition on
 * the consuming rules eases that snap so it reads as a smooth glide into place rather than a jump.
 */
export function useVisualViewportInset(): void {
    useEffect(() => {
        const viewport = window.visualViewport
        if (!viewport) return

        const root = document.documentElement
        // The last values written, so a settle that didn't actually move the visible rectangle writes nothing and the
        // controls (and their transition) stay untouched.
        const last = {left: NaN, top: NaN, right: NaN, bottom: NaN, invScale: NaN}
        let settleTimer = 0

        // Writes the current visible-rectangle metrics as CSS variables. Gaps are in layout CSS pixels (as are the
        // controls' rem insets), so each control shifts by exactly how far the visible rectangle is inset from its
        // layout-viewport edge; the inverse scale counter-zooms it. Only changed values are written.
        const write = () => {
            settleTimer = 0
            const left = viewport.offsetLeft
            const top = viewport.offsetTop
            const right = window.innerWidth - viewport.offsetLeft - viewport.width
            const bottom = window.innerHeight - viewport.offsetTop - viewport.height
            const invScale = 1 / viewport.scale
            if (left !== last.left) root.style.setProperty('--vv-left', `${(last.left = left)}px`)
            if (top !== last.top) root.style.setProperty('--vv-top', `${(last.top = top)}px`)
            if (right !== last.right) root.style.setProperty('--vv-right', `${(last.right = right)}px`)
            if (bottom !== last.bottom) root.style.setProperty('--vv-bottom', `${(last.bottom = bottom)}px`)
            if (invScale !== last.invScale) root.style.setProperty('--vv-inv-scale', `${(last.invScale = invScale)}`)
        }

        // Each event restarts the quiet timer, so the write fires only after the gesture stops rather than during it.
        const schedule = () => {
            if (settleTimer) clearTimeout(settleTimer)
            settleTimer = window.setTimeout(write, SETTLE_MS)
        }

        write() // Position correctly at rest before any gesture.
        // The browser's post-load pinch-zoom restore fires no visual-viewport event, so poll briefly to catch it; each
        // write no-ops when nothing changed, so this quietly stops mattering once the viewport is stable.
        const pollStart = Date.now()
        const pollTimer = window.setInterval(() => {
            write()
            if (Date.now() - pollStart >= RESTORE_SETTLE_MS) clearInterval(pollTimer)
        }, RESTORE_POLL_MS)
        // A route change swaps the page without a visual-viewport event; the document resize it causes is our signal to
        // re-read so the new page's chrome anchors to the (possibly zoomed) visible rectangle.
        const resizeObserver = new ResizeObserver(schedule)
        resizeObserver.observe(document.documentElement)
        // Pinch-zoom fires these on the visual viewport; window resize covers layout-viewport changes (rotation, chrome).
        viewport.addEventListener('resize', schedule)
        viewport.addEventListener('scroll', schedule)
        window.addEventListener('resize', schedule)
        return () => {
            if (settleTimer) clearTimeout(settleTimer)
            clearInterval(pollTimer)
            resizeObserver.disconnect()
            viewport.removeEventListener('resize', schedule)
            viewport.removeEventListener('scroll', schedule)
            window.removeEventListener('resize', schedule)
        }
    }, [])
}
