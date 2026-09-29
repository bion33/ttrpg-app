import type {RefObject} from 'react'
import {useLayoutEffect, useState} from 'react'

/**
 * Default font size for an auto-fitting field that sets none of its own.
 */
export const DEFAULT_FONT_SIZE = 9

/**
 * Smallest font size the auto-fit shrink loop will apply.
 */
export const MIN_FONT_SIZE = 6

/**
 * Shrinks an element's font size until its content fits the given axis, returning the size to render at.
 */
export function useAutoFitFontSize(
    elementReference: RefObject<HTMLElement | null>,
    value: string,
    maxFontSize: number,
    axis: 'width' | 'height',
): number {
    const [fontSize, setFontSize] = useState(maxFontSize)

    useLayoutEffect(() => {
        const element = elementReference.current
        if (!element) return

        // Shrink-to-fit is a DOM measurement: transiently write the element's font size, measure, then store the
        // fitted size for rendering. Both steps are the documented layout-measurement exception to these rules.
        let size = maxFontSize
        // eslint-disable-next-line react-hooks/immutability -- transient measurement write to the DOM element
        element.style.fontSize = `${size}px`
        while (size > MIN_FONT_SIZE && overflows(element, axis)) {
            size -= 1
            element.style.fontSize = `${size}px`
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect -- storing a measured layout value
        setFontSize(size)
    }, [elementReference, value, maxFontSize, axis])

    return fontSize
}

// Whether the element's content overflows the measured axis.
function overflows(element: HTMLElement, axis: 'width' | 'height'): boolean {
    return axis === 'width' ? element.scrollWidth > element.clientWidth : element.scrollHeight > element.clientHeight
}
