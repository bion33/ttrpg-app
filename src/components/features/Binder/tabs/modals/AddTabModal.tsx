import Modal from '@ui/Modal/Modal'
import type {PageType} from '@features/Binder/pageTypes.ts'
import AddTabForm from './AddTabForm.tsx'

/**
 * Props for the add-tab dialogue: it reports the chosen name, type, and (for a markdown page) an optional markdown
 * template to seed its content from, or a cancellation.
 */
interface AddTabModalProps {
    onCreate: (name: string, type: PageType, markdownTemplateId?: string) => void
    onCancel: () => void
}

/**
 * Modal dialogue for adding a tab: frames the add-tab form in its own dialog.
 */
function AddTabModal({onCreate, onCancel}: AddTabModalProps) {
    return (
        <Modal title="Add tab" onClose={onCancel}>
            <AddTabForm onCreate={onCreate} onCancel={onCancel}/>
        </Modal>
    )
}

export default AddTabModal
