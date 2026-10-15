import {useEffect, useRef} from 'react'

/**
 * Intercepts Ctrl/Cmd+S so the browser's own save-page dialog never opens, triggering an app save instead regardless of
 * whether autosave is enabled.
 */
export function useSaveShortcut(save: () => void): void {
    // The listener fires outside render, so read the freshest save through a ref (updated after each commit) rather than
    // a stale closure, and bind the listener once.
    const saveRef = useRef(save)
    useEffect(() => {
        saveRef.current = save
    })

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 's') {
                event.preventDefault()
                saveRef.current()
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [])
}
