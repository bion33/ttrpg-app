import {useSyncExternalStore} from 'react'

// A coarse primary pointer (phone/tablet touchscreen) is the signal that native pinch-zoom and two-finger pan are the
// device's own gesture; combined with a visual viewport to pan, the app's zoom buttons and viewport-following chrome
// are redundant there. The query is re-evaluated reactively so plugging in a mouse (fine pointer) brings them back.
const COARSE_POINTER = '(pointer: coarse)'

/**
 * Whether the device offers native pinch-zoom and pan as its primary gesture (a coarse-pointer touchscreen).
 */
export function usePinchZoomCapable(): boolean {
    return useSyncExternalStore(subscribe, getSnapshot)
}

function subscribe(onChange: () => void): () => void {
    const query = window.matchMedia(COARSE_POINTER)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
}

function getSnapshot(): boolean {
    return Boolean(window.visualViewport) && window.matchMedia(COARSE_POINTER).matches
}
