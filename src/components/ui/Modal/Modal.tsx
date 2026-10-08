import type {CSSProperties, ReactNode} from 'react'
import {useId} from 'react'
import './Modal.css'
import {usePinchZoomCapable} from '@hooks/usePinchZoomCapable.ts'
import {useVisualViewportRect} from '@hooks/useVisualViewportRect.ts'

/**
 * Props for the modal: its heading, the content it frames, and the close callback (backdrop click and Escape).
 */
interface ModalProps {
    title: string
    onClose: () => void
    children: ReactNode
}

/**
 * A centred dialog over a dimmed backdrop, closing on a backdrop click or Escape; callers supply the body content.
 */
function Modal({title, onClose, children}: ModalProps) {
    const titleId = useId()
    // On a pinch-zoom device the dialog is pinned to the currently visible rectangle so a zoomed-in user sees it, and
    // counter-scaled by the inverse zoom so it renders at its natural (1x) size instead of being squished into the
    // narrowed visible width; desktop keeps the plain centred dialog (viewportRect stays null).
    const pinchCapable = usePinchZoomCapable()
    const viewportRect = useVisualViewportRect(pinchCapable)
    const backdropStyle: CSSProperties | undefined = viewportRect
        ? {
            left: `${viewportRect.offsetLeft}px`,
            top: `${viewportRect.offsetTop}px`,
            width: `${viewportRect.width}px`,
            height: `${viewportRect.height}px`,
        }
        : undefined
    // Counter-scale around the dialog's centre (flex already centres it in the visible rectangle); the height cap is
    // the natural height whose scaled image just fills the visible rectangle, so a tall dialog scrolls within it.
    const modalStyle: CSSProperties | undefined = viewportRect
        ? {
            transform: `scale(${1 / viewportRect.scale})`,
            maxHeight: `${viewportRect.height * viewportRect.scale}px`,
        }
        : undefined
    const pinned = viewportRect != null
    return (
        <div
            className={pinned ? 'modal__backdrop modal__backdrop--pinned' : 'modal__backdrop'}
            style={backdropStyle}
            onMouseDown={onClose}
        >
            <div
                className={pinned ? 'modal modal--sheet' : 'modal'}
                style={modalStyle}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onMouseDown={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                    if (event.key === 'Escape') onClose()
                }}
            >
                <h2 id={titleId} className="modal__title">{title}</h2>
                {children}
            </div>
        </div>
    )
}

export default Modal
