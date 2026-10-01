import type {RefObject} from 'react'
import {useEffect, useRef, useState} from 'react'
import {useAtom} from 'jotai'
import {atomWithStorage} from 'jotai/utils'
import {notifyingStorage} from '@lib/storage/observableStorage.ts'

/**
 * How much of the viewport width the page should occupy, shared across binders and persisted. Stored as a fraction of
 * the viewport (not a raw scale), so the same zoom reads identically on any screen size and syncs across devices.
 */
const widthFractionAtom = atomWithStorage('pageWidthFraction', 0.5, notifyingStorage<number>())

// How much each step changes the width fraction, the smallest fraction allowed, and the margin kept short of the edge.
const FRACTION_STEP = 0.2
const MIN_FRACTION = 0.4
const FIT_MARGIN = 0.98

/**
 * What the page-scale hook returns: the current scale, the step controls with their enabled flags, and the ref to put
 * on the scaled wrapper so its layout width can be measured.
 */
interface PageScale {
    scale: number
    scaleUp: () => void
    scaleDown: () => void
    canScaleUp: boolean
    canScaleDown: boolean
    viewReference: RefObject<HTMLDivElement | null>
}

// Rounds a fraction to two decimals so repeated steps do not drift into float noise.
function roundFraction(value: number): number {
    return Math.round(value * 100) / 100
}

/**
 * Owns the persisted page-view zoom as a fraction of the viewport width: the page occupies that fraction regardless of
 * its natural width, so zoom feels uniform across page types (A4 sheet, notes) and screen sizes. Takes the active
 * page's natural (unscaled) width and returns the resulting scale, its step controls, and the ref for the wrapper.
 */
export function usePageScale(naturalWidthPx: number): PageScale {
    const [widthFraction, setWidthFraction] = useAtom(widthFractionAtom)
    // The scaled wrapper, measured to keep the page plus its chrome (tab strip, margins) from overflowing the viewport.
    const viewReference = useRef<HTMLDivElement>(null)
    // The wrapper's unscaled layout width (the sheet plus its surrounding chrome), tracked so the fit ceiling stays fresh.
    const [layoutWidth, setLayoutWidth] = useState(naturalWidthPx)
    // The viewport width the fraction is taken of, tracked so the scale recomputes as the window resizes.
    const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth)

    // Tracks the wrapper's unscaled layout width (changes only when the page's own layout does, not on viewport resize).
    useEffect(() => {
        const view = viewReference.current
        if (!view) return
        const update = () => setLayoutWidth(view.offsetWidth)
        update()
        const observer = new ResizeObserver(update)
        observer.observe(view)
        return () => observer.disconnect()
    }, [])

    // Tracks the viewport width, which the chosen fraction is measured against.
    useEffect(() => {
        const update = () => setViewportWidth(window.innerWidth)
        update()
        window.addEventListener('resize', update)
        return () => window.removeEventListener('resize', update)
    }, [])

    // The largest fraction at which the page plus its chrome still fits the viewport width (the sheet is a share of the
    // measured wrapper, so the bare-sheet fraction is scaled down by the chrome the wrapper adds around it).
    const maxFraction = layoutWidth > 0 ? (FIT_MARGIN * naturalWidthPx) / layoutWidth : FIT_MARGIN
    // The applied fraction, clamped to the current page's fit ceiling (the stored value is left untouched for syncing).
    const fraction = Math.min(widthFraction, maxFraction)
    const scale = (fraction * viewportWidth) / naturalWidthPx

    // Widens the page by one step, stopping once it (with its chrome) fills the viewport width.
    function scaleUp() {
        setWidthFraction((previous) => Math.min(maxFraction, roundFraction(previous + FRACTION_STEP)))
    }

    // Narrows the page by one step, down to the minimum fraction.
    function scaleDown() {
        setWidthFraction((previous) => Math.max(MIN_FRACTION, roundFraction(previous - FRACTION_STEP)))
    }

    return {
        scale,
        scaleUp,
        scaleDown,
        canScaleUp: widthFraction < maxFraction,
        canScaleDown: widthFraction > MIN_FRACTION,
        viewReference,
    }
}
