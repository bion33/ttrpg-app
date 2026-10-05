/**
 * A top-level URL route of the app: the main binder/page surface (its own in-app location model), or one of the
 * standalone legal pages.
 */
export type Route = 'app' | 'privacy' | 'terms' | 'ginfo'

// The URL path owned by each non-default route; any unmatched path resolves to the main app surface.
const ROUTE_PATHS: Record<Exclude<Route, 'app'>, string> = {
    privacy: '/privacy',
    terms: '/terms',
    ginfo: '/ginfo',
}

/**
 * The route a URL path addresses, defaulting to the main app surface for any unrecognised path.
 */
export function routeForPath(pathname: string): Route {
    const normalised = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname
    const match = (Object.keys(ROUTE_PATHS) as Exclude<Route, 'app'>[]).find((route) => ROUTE_PATHS[route] === normalised)
    return match ?? 'app'
}

/**
 * The URL path that addresses a route.
 */
export function pathForRoute(route: Route): string {
    return route === 'app' ? '/' : ROUTE_PATHS[route]
}
