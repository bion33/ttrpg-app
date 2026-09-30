import type {RefObject} from 'react'
import {useEffect, useRef, useState} from 'react'
import {useAtom} from 'jotai'
import {atomWithStorage} from 'jotai/utils'
import {notifyingStorage} from '@lib/storage/observableStorage.ts'

/** How far the page and tab strip are scaled, shared across binders and persisted to storage. */
const pageScaleAtom = atomWithStorage('pageScale', 1, notifyingStorage<number>())

// How much each scale step changes the scale, and the smallest scale allowed.
const SCALE_STEP = 0.25
const MIN_SCALE = 0.45

/**
 * What the page-scale hook returns: the current scale, the step controls with their enabled flags, and the ref to put
 * on the scaled wrapper so its width can be measured.
 */
interface PageScale {
    scale: number
    scaleUp: () => void
    scaleDown: () => void
    canScaleUp: boolean
    canScaleDown: boolean
    viewReference: RefObject<HTMLDivElement | null>
}

/**
 * Owns the persisted page-view scale: step up/down within a floor and a viewport-fit ceiling tracked from the scaled
 * wrapper's layout width, returning the scale, its controls, and the ref to attach to that wrapper.
 */
export function usePageScale(): PageScale {
    const [scale, setScale] = useAtom(pageScaleAtom)
    // The scaled wrapper, measured to keep the page from growing past the screen width.
    const viewReference = useRef<HTMLDivElement>(null)
    // The largest scale at which the page still fits the screen width, tracked from the wrapper's unscaled layout
    // width so it stays fresh as the viewport resizes; held 2% short of the edge to leave a sliver of margin.
    const [maxScale, setMaxScale] = useState(Infinity)

    // Recomputes the max scale from the wrapper's unscaled layout width whenever that width changes (viewport resize).
    useEffect(() => {
        const view = viewReference.current
        if (!view) return
        const update = () => setMaxScale((window.innerWidth / view.offsetWidth) * 0.98)
        update()
        const observer = new ResizeObserver(update)
        observer.observe(view)
        return () => observer.disconnect()
    }, [])

    // Enlarges the page and tabs by one step, stopping once they fill the screen width.
    function scaleUp() {
        setScale((previous) => Math.min(maxScale, Math.round((previous + SCALE_STEP) * 100) / 100))
    }

    // Shrinks the page and tabs by one step, down to the minimum scale.
    function scaleDown() {
        setScale((previous) => Math.max(MIN_SCALE, Math.round((previous - SCALE_STEP) * 100) / 100))
    }

    return {scale, scaleUp, scaleDown, canScaleUp: scale < maxScale, canScaleDown: scale > MIN_SCALE, viewReference}
}
