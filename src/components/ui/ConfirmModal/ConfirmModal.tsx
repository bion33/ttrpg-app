import Modal from '@ui/Modal/Modal'
import ConfirmBody from './ConfirmBody.tsx'

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
            <ConfirmBody message={message} confirmLabel={confirmLabel} variant={variant} onConfirm={onConfirm}
                         onCancel={onCancel}/>
        </Modal>
    )
}

export default ConfirmModal
