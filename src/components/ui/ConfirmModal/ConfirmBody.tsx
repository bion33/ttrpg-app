/**
 * Props for the confirm body: the message to show, the confirm button's label and variant, and the confirm/cancel
 * callbacks.
 */
interface ConfirmBodyProps {
    message: string
    confirmLabel: string
    variant?: 'primary' | 'danger'
    onConfirm: () => void
    onCancel: () => void
}

/**
 * The body of a confirmation dialogue: a message with a cancel button and a variant-styled confirm button. Rendered on
 * its own inside a modal that is swapping its body, or wrapped by `ConfirmModal` as a standalone dialogue.
 */
function ConfirmBody({message, confirmLabel, variant = 'primary', onConfirm, onCancel}: ConfirmBodyProps) {
    return (
        <div className="modal__body">
            <p className="modal__prompt">{message}</p>
            <div className="modal__actions">
                <button type="button" className="modal__btn" onClick={onCancel}>Cancel</button>
                <button type="button" className={`modal__btn modal__btn--${variant}`} onClick={onConfirm}>
                    {confirmLabel}
                </button>
            </div>
        </div>
    )
}

export default ConfirmBody
