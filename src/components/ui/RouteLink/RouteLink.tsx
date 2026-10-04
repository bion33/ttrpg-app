import type {ReactNode} from 'react'
import type {Route} from '@lib/navigation/routes.ts'
import {pathForRoute} from '@lib/navigation/routes.ts'
import {isModifiedClick} from '@lib/navigation/isModifiedClick.ts'
import {useNavigateRoute} from '@hooks/useRoute.ts'

/**
 * Props for a route link: the route it points to, an optional class, and its visible content.
 */
interface RouteLinkProps {
    route: Route
    className?: string
    children: ReactNode
}

/**
 * An anchor to a top-level route that navigates client-side on a plain click while keeping a real href, so modifier
 * clicks still open in a new tab and the URL stays shareable.
 */
function RouteLink({route, className, children}: RouteLinkProps) {
    const navigateRoute = useNavigateRoute()
    return (
        <a
            className={className}
            href={pathForRoute(route)}
            onClick={(event) => {
                if (isModifiedClick(event)) return
                event.preventDefault()
                navigateRoute(route)
            }}
        >
            {children}
        </a>
    )
}

export default RouteLink
