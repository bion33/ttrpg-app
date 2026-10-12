import {isHttpUrl} from '@lib/url/httpUrl.ts'

/**
 * A parsed internal link: the route path it addresses (empty for a heading-only link on the current page) and the
 * heading slug it scrolls to (empty for none).
 */
export interface InternalHref {
    path: string
    heading: string
}

/**
 * Whether a link href is an in-app link — an app route path (`/…`) or a bare heading anchor (`#…`) — rather than an
 * external http(s) URL that opens in a new browser tab.
 */
export function isInternalHref(href: string): boolean {
    if (isHttpUrl(href)) return false
    return href.startsWith('/') || href.startsWith('#')
}

/**
 * Splits an internal href into its route path and heading slug on the first `#`; a heading-only href yields an empty
 * path (the link stays on the current page).
 */
export function parseInternalHref(href: string): InternalHref {
    const hash = href.indexOf('#')
    if (hash < 0) return {path: href, heading: ''}
    return {path: href.slice(0, hash), heading: href.slice(hash + 1)}
}
