import type {ReactNode} from 'react'
import {useId} from 'react'
import './Modal.css'

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
    return (
        <div className="modal__backdrop" onMouseDown={onClose}>
            <div
                className="modal"
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
