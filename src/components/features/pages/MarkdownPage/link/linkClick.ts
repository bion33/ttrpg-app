import type {NavigateFunction} from 'react-router'
import {isInternalHref} from '@lib/navigation/internalLink.ts'

// Whether the browser should handle a click itself (new tab, download, …) rather than it being intercepted.
function isModifiedClick(event: MouseEvent): boolean {
    return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
}

/**
 * Handles a click on a link inside the editor: an in-app link (route path or heading anchor) navigates client-side via
 * the router, an external link opens in a new browser tab, and a modified click (new tab, etc.) is left to the browser.
 * Returns whether the click was consumed. Wired as the editor's DOM click handler.
 */
export function handleLinkClick(event: MouseEvent, navigate: NavigateFunction): boolean {
    const anchor = (event.target as HTMLElement | null)?.closest('a')
    const href = anchor?.getAttribute('href')
    if (!href || isModifiedClick(event)) return false
    event.preventDefault()
    if (isInternalHref(href)) navigate(href)
    else window.open(href, '_blank', 'noopener,noreferrer')
    return true
}
