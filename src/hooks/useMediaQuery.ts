import {useSyncExternalStore} from 'react'

/**
 * Whether the given CSS media query currently matches, re-evaluated reactively as the viewport changes.
 */
export function useMediaQuery(query: string): boolean {
    return useSyncExternalStore(
        (onChange) => {
            const mediaQuery = window.matchMedia(query)
            mediaQuery.addEventListener('change', onChange)
            return () => mediaQuery.removeEventListener('change', onChange)
        },
        () => window.matchMedia(query).matches,
    )
}
