import Modal from '../Modal/Modal'

/**
 * Props for the confirm dialog: its heading, the message to show, the confirm button's label and variant, and the
 * confirm/cancel callbacks.
 */
interface ConfirmModalProps {
    title: string
    message: string
    confirmLabel: string
    variant?: 'primary' | 'danger'
    onConfirm: () => void
    onCancel: () => void
}

/**
 * A Modal-based confirmation dialog: shows a message with a cancel button and a variant-styled confirm button.
 */
function ConfirmModal({title, message, confirmLabel, variant = 'primary', onConfirm, onCancel}: ConfirmModalProps) {
    return (
        <Modal title={title} onClose={onCancel}>
            <div className="modal__body">
                <p className="modal__prompt">{message}</p>
                <div className="modal__actions">
                    <button type="button" className="modal__btn" onClick={onCancel}>Cancel</button>
                    <button type="button" className={`modal__btn modal__btn--${variant}`} onClick={onConfirm}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </Modal>
    )
}

export default ConfirmModal
