import {useCallback, useEffect} from 'react'
import {useAtomValue, useStore} from 'jotai'
import {atomWithStorage} from 'jotai/utils'
import {notifyingStorage} from '@lib/storage/observableStorage.ts'
import type {Location} from '@lib/navigation/navigation.ts'
import {libraryLocation, sameLocation} from '@lib/navigation/navigation.ts'

/** The location currently shown, persisted so a reload reopens the same binder and page. */
const locationAtom = atomWithStorage<Location>('location', libraryLocation(), notifyingStorage<Location>())

/**
 * The location currently shown (which binder is open and which page is active).
 */
export function useLocation(): Location {
    return useAtomValue(locationAtom)
}

/**
 * Returns a navigate function that moves to a location and pushes a browser-history entry, so the browser's Back and
 * Forward controls step between visited locations; navigating to the current location is a no-op.
 */
export function useNavigate(): (next: Location) => void {
    const store = useStore()
    return useCallback((next: Location) => {
        if (sameLocation(store.get(locationAtom), next)) return
        store.set(locationAtom, next)
        history.pushState(next, '')
    }, [store])
}

/**
 * Wires the location to browser history: seeds the current entry with the persisted location so Back can return to it,
 * and applies Back/Forward jumps to the shown location. Call once, at the app root.
 */
export function useNavigationHistory(): void {
    const store = useStore()
    useEffect(() => {
        history.replaceState(store.get(locationAtom), '')
        const onPopState = (event: PopStateEvent) => {
            store.set(locationAtom, (event.state as Location | null) ?? libraryLocation())
        }
        window.addEventListener('popstate', onPopState)
        return () => window.removeEventListener('popstate', onPopState)
    }, [store])
}
