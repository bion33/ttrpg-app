import './BinderModal.css'
import Modal from '../../../ui/Modal/Modal'

/**
 * Props for the delete confirmation: the label of the binder at risk, and the confirm/cancel callbacks.
 */
interface DeleteBinderModalProps {
    label: string
    onConfirm: () => void
    onCancel: () => void
}

/**
 * Modal confirming a binder's deletion, warning that all of its pages and their saved fields are removed.
 */
export function DeleteBinderModal({label, onConfirm, onCancel}: DeleteBinderModalProps) {
    return (
        <Modal title="Delete binder" onClose={onCancel}>
            <div className="modal__body">
                <p className="binder-modal__prompt">
                    Delete “{label}”? Every page in it and everything saved on them are removed. This cannot be undone.
                </p>
                <div className="modal__actions">
                    <button type="button" className="modal__btn" onClick={onCancel}>Cancel</button>
                    <button type="button" className="modal__btn modal__btn--danger" onClick={onConfirm}>Delete</button>
                </div>
            </div>
        </Modal>
    )
}
