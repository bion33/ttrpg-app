/**
 * The subset of a click event that decides whether the browser should handle a link itself: a non-primary button or a
 * held modifier (open-in-new-tab, download, …), or an already-handled event.
 */
export interface ClickModifiers {
    defaultPrevented: boolean
    button: number
    metaKey: boolean
    ctrlKey: boolean
    shiftKey: boolean
    altKey: boolean
}

/**
 * Whether a link click should be left to the browser rather than intercepted for client-side navigation.
 */
export function isModifiedClick(event: ClickModifiers): boolean {
    return (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
    )
}
