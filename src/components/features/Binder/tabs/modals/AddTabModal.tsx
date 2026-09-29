import {useState} from 'react'
import Modal from '../../../../ui/Modal/Modal'
import {PAGE_TYPES, type PageType} from '../../pageTypes.ts'
import {useNameForm} from '../../../../../hooks/useNameForm.ts'

/**
 * Props for the add-tab dialogue: it reports the chosen name and type, or a cancellation.
 */
interface AddTabModalProps {
    onCreate: (name: string, type: PageType) => void
    onCancel: () => void
}

/**
 * Modal dialogue for adding a tab: collects a name and a page type, replacing the old window.prompt flow.
 */
function AddTabModal({onCreate, onCancel}: AddTabModalProps) {
    const [type, setType] = useState<PageType>(PAGE_TYPES[0].value)
    const {name, setName, nameReference, submit} = useNameForm('', (trimmed) => onCreate(trimmed, type))

    return (
        <Modal title="Add tab" onClose={onCancel}>
            <form className="modal__body" onSubmit={submit}>
                <label className="modal__field">
                    <span>Name</span>
                    <input
                        ref={nameReference}
                        type="text"
                        maxLength={14}
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                    />
                </label>

                <label className="modal__field">
                    <span>Type</span>
                    <select value={type} onChange={(event) => setType(event.target.value as PageType)}>
                        {PAGE_TYPES.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </label>

                <div className="modal__actions">
                    <button type="button" className="modal__btn" onClick={onCancel}>Cancel</button>
                    <button type="submit" className="modal__btn modal__btn--primary" disabled={!name.trim()}>
                        Add
                    </button>
                </div>
            </form>
        </Modal>
    )
}

export default AddTabModal
