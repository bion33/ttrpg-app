import {useEffect, useRef} from 'react'

/**
 * The ports the autosave flush drives: whether there is unsaved work a clean write could flush (which gates the
 * before-unload nag), and the flush itself, which cancels the pending autosave debounce and issues the write now.
 */
export interface AutosaveFlushPorts {
    hasPendingWrite(): boolean

    flush(): void
}

/**
 * Flushes a pending debounced autosave whenever the page is about to become inactive, so an edit made in the last
 * debounce window still reaches the remote before the tab is hidden, backgrounded, or closed.
 *
 * `visibilitychange`→hidden and window `blur` flush while the page is fully alive (a normal, uncapped fetch). On
 * `beforeunload` with unsaved work, it dispatches the same normal fetch and then shows the browser's native confirmation
 * dialog: the page stays alive while the user reads it, giving the already-dispatched request time to complete. The
 * synchronous per-edit `localStorage` write means only the remote copy can ever lag, so this is best-effort by design —
 * a service-worker Background Sync is the future path for completing an upload after the page is truly gone.
 */
export function useAutosaveFlush({hasPendingWrite, flush}: AutosaveFlushPorts): void {
    // The listeners fire outside render, so read the freshest ports through a ref (updated after each commit) rather than
    // a stale closure, and bind the listeners once.
    const ports = useRef({hasPendingWrite, flush})
    useEffect(() => {
        ports.current = {hasPendingWrite, flush}
    })

    useEffect(() => {
        const onVisibilityChange = () => {
            if (document.visibilityState === 'hidden') ports.current.flush()
        }
        const onBlur = () => ports.current.flush()
        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!ports.current.hasPendingWrite()) return
            // Dispatch the save, then hold the page open with the native prompt so the request can land before teardown.
            ports.current.flush()
            event.preventDefault()
            event.returnValue = ''
        }
        document.addEventListener('visibilitychange', onVisibilityChange)
        window.addEventListener('blur', onBlur)
        window.addEventListener('beforeunload', onBeforeUnload)
        return () => {
            document.removeEventListener('visibilitychange', onVisibilityChange)
            window.removeEventListener('blur', onBlur)
            window.removeEventListener('beforeunload', onBeforeUnload)
        }
    }, [])
}
