import {useEffect, type RefObject} from 'react'

/**
 * Calls `onDismiss` when a pointer press lands outside `containerReference`, while `active` is true.
 */
export function useDismissOnOutside(
    containerReference: RefObject<HTMLElement | null>,
    active: boolean,
    onDismiss: () => void,
): void {
    useEffect(() => {
        if (!active) return
        function onPointerDown(event: PointerEvent) {
            if (!containerReference.current?.contains(event.target as Node)) onDismiss()
        }
        document.addEventListener('pointerdown', onPointerDown)
        return () => document.removeEventListener('pointerdown', onPointerDown)
    }, [active, onDismiss, containerReference])
}
