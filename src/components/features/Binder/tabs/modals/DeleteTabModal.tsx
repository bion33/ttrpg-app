import './TabModal.css'
import Modal from '../../../../ui/Modal/Modal'

/**
 * Props for the delete confirmation: the label of the tab at risk, and the confirm/cancel callbacks.
 */
interface DeleteTabModalProps {
    label: string
    onConfirm: () => void
    onCancel: () => void
}

/**
 * Modal confirming a tab's deletion, warning that the page and its saved fields are removed.
 */
export function DeleteTabModal({label, onConfirm, onCancel}: DeleteTabModalProps) {
    return (
        <Modal title="Delete tab" onClose={onCancel}>
            <div className="modal__body">
                <p className="tab-modal__prompt">
                    Delete “{label}”? This page and everything saved on it will be removed, which cannot be undone.
                </p>
                <div className="modal__actions">
                    <button type="button" className="modal__btn" onClick={onCancel}>Cancel</button>
                    <button type="button" className="modal__btn modal__btn--danger" onClick={onConfirm}>Delete</button>
                </div>
            </div>
        </Modal>
    )
}
