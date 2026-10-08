// Below this scale the page isn't meaningfully pinch-zoomed, so the visible rectangle equals the layout viewport and
// every inset must read as zero. Matches useVisualViewportZoomed's threshold.
const ZOOMED_THRESHOLD = 1.01

/**
 * Layout- and visual-viewport metrics a pinch-zoom inset is derived from.
 */
export interface VisualViewportMetrics {
    innerWidth: number
    innerHeight: number
    offsetLeft: number
    offsetTop: number
    height: number
    scale: number
}

/**
 * Per-side gap between the layout viewport and the pinch rectangle, the inverse zoom, and the on-screen keyboard's
 * height.
 */
export interface ViewportInset {
    left: number
    top: number
    right: number
    bottom: number
    invScale: number
    keyboardInset: number
}

/**
 * Gap on each side between the layout viewport and the pinch-zoom rectangle, for anchoring fixed chrome to the
 * visible corners rather than the layout viewport.
 *
 * Only a genuine pinch-zoom insets the rectangle; at scale 1 every gap is zero, so an on-screen keyboard or address
 * bar (which pans/shrinks the visual viewport without zooming) can't move the chrome. When zoomed, the rectangle is
 * sized from the pinch geometry (layout / scale) rather than the measured visual-viewport size, so a keyboard that
 * shrinks the visual viewport below that geometry drops out of the trailing-edge gaps; gaps clamp to zero.
 *
 * `keyboardInset` is the keyboard's height (layout height minus measured visual-viewport height), for lifting a
 * bottom-anchored control above a keyboard that overlays the layout viewport (iOS Safari, and anywhere the
 * `interactive-widget=resizes-content` meta tag is unsupported). It has no offset term, so panning the visual viewport
 * can't drift it; where the keyboard resizes the layout viewport instead (Android Chrome/Firefox) both heights shrink
 * together and it reads zero. Only computed unzoomed — a pinch shrinks the visual viewport on its own, which this
 * would misread as a keyboard.
 */
export function computeViewportInset(metrics: VisualViewportMetrics): ViewportInset {
    if (metrics.scale <= ZOOMED_THRESHOLD) {
        return {
            left: 0, top: 0, right: 0, bottom: 0, invScale: 1,
            keyboardInset: Math.max(0, metrics.innerHeight - metrics.height),
        }
    }
    const geometricWidth = metrics.innerWidth / metrics.scale
    const geometricHeight = metrics.innerHeight / metrics.scale
    return {
        left: Math.max(0, metrics.offsetLeft),
        top: Math.max(0, metrics.offsetTop),
        right: Math.max(0, metrics.innerWidth - metrics.offsetLeft - geometricWidth),
        bottom: Math.max(0, metrics.innerHeight - metrics.offsetTop - geometricHeight),
        invScale: 1 / metrics.scale,
        keyboardInset: 0,
    }
}
