import Modal from '@ui/Modal/Modal'
import EditTabForm from './EditTabForm.tsx'

/**
 * Props for the edit dialogue: the current label and hue to seed the fields, and the save/cancel callbacks.
 */
interface EditTabModalProps {
    initialLabel: string
    initialHue: number
    onSave: (name: string, hue: number) => void
    onCancel: () => void
}

/**
 * Modal for editing a tab: frames the edit-tab form (rename + recolour) in its own dialog.
 */
function EditTabModal({initialLabel, initialHue, onSave, onCancel}: EditTabModalProps) {
    return (
        <Modal title="Edit tab" onClose={onCancel}>
            <EditTabForm initialLabel={initialLabel} initialHue={initialHue} onSave={onSave} onCancel={onCancel}/>
        </Modal>
    )
}

export default EditTabModal
