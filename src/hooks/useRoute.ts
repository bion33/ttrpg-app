import {useCallback, useSyncExternalStore} from 'react'
import type {Route} from '@lib/navigation/routes.ts'
import {pathForRoute, routeForPath} from '@lib/navigation/routes.ts'

// Dispatched on the window after a client-side route push so the current tab re-reads the route (popstate fires only
// for Back/Forward, not for our own pushState).
const ROUTE_CHANGE_EVENT = 'routechange'

// Subscribes a listener to route changes: browser Back/Forward (popstate) and this tab's own client-side pushes.
function subscribe(onChange: () => void): () => void {
    window.addEventListener('popstate', onChange)
    window.addEventListener(ROUTE_CHANGE_EVENT, onChange)
    return () => {
        window.removeEventListener('popstate', onChange)
        window.removeEventListener(ROUTE_CHANGE_EVENT, onChange)
    }
}

/**
 * The top-level route addressed by the current browser URL, re-read on Back/Forward and on client-side navigation.
 */
export function useRoute(): Route {
    return useSyncExternalStore(subscribe, () => routeForPath(window.location.pathname))
}

/**
 * Returns a navigate function that moves to a top-level route by pushing its URL as a browser-history entry, without a
 * full page load; navigating to the current route is a no-op.
 */
export function useNavigateRoute(): (next: Route) => void {
    return useCallback((next: Route) => {
        if (routeForPath(window.location.pathname) === next) return
        history.pushState(history.state, '', pathForRoute(next))
        window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT))
    }, [])
}
