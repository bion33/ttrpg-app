import type {NavigateFunction} from 'react-router'
import {isInternalHref} from '@lib/navigation/internalLink.ts'

// Whether the browser should handle a click itself (new tab, selection, …) rather than it being intercepted.
function isModifiedClick(event: MouseEvent): boolean {
    return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
}

/**
 * Cancels the default mousedown on a link so the editor neither focuses it nor (in Firefox) selects the
 * `contenteditable="false"` link node — a selected node swallows the next click, breaking repeat clicks. The click
 * event still fires, so `handleLinkClick` navigates as normal. Returns whether the mousedown was consumed.
 */
export function handleLinkMousedown(event: MouseEvent): boolean {
    const anchor = (event.target as HTMLElement | null)?.closest('a')
    if (!anchor?.getAttribute('href') || isModifiedClick(event)) return false
    event.preventDefault()
    return true
}

/**
 * Follows a click on a link inside the editor: an in-app link (route path or heading anchor) navigates client-side via
 * the router, an external link opens in a new browser tab, and a modified click (new tab, etc.) is left to the browser.
 * A heading-only link (`#slug`, always the current page) also scrolls imperatively via `scrollToHeading`, since
 * re-clicking the link the hash already points at is a router no-op that would not re-trigger the hash-change scroll.
 * The link mark renders `contenteditable="false"`, so this click fires reliably across browsers (including mobile) and
 * the caret never lands inside the link. Returns whether the click was consumed. Wired as the editor's DOM handler.
 */
export function handleLinkClick(
    event: MouseEvent,
    navigate: NavigateFunction,
    scrollToHeading: (slug: string) => void,
): boolean {
    const anchor = (event.target as HTMLElement | null)?.closest('a')
    const href = anchor?.getAttribute('href')
    if (!href || isModifiedClick(event)) return false
    event.preventDefault()
    if (!isInternalHref(href)) {
        window.open(href, '_blank', 'noopener,noreferrer')
        return true
    }
    navigate(href)
    if (href.startsWith('#')) scrollToHeading(href.slice(1))
    return true
}
