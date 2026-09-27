import {useEffect, useRef, useState, type SyntheticEvent} from 'react'
import './AddPageModal.css'
import Modal from '../../ui/Modal/Modal'
import {PAGE_TYPES, type PageType} from './pageTypes.ts'

/**
 * Props for the add-page dialogue: it reports the chosen name and type, or a cancellation.
 */
interface AddPageModalProps {
    onCreate: (name: string, type: PageType) => void
    onCancel: () => void
}

/**
 * Modal dialogue for adding a page: collects a name and a page type, replacing the old window.prompt flow.
 */
function AddPageModal({onCreate, onCancel}: AddPageModalProps) {
    const [name, setName] = useState('')
    const [type, setType] = useState<PageType>(PAGE_TYPES[0].value)
    const nameRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        nameRef.current?.focus()
    }, [])

    // Validates the name, then reports the new page to the parent.
    function submit(event: SyntheticEvent) {
        event.preventDefault()
        const trimmed = name.trim()
        if (!trimmed) return
        onCreate(trimmed, type)
    }

    return (
        <Modal title="Add page" onClose={onCancel}>
            <form className="add-page-modal" onSubmit={submit}>
                <label className="add-page-modal__field">
                    <span>Name</span>
                    <input
                        ref={nameRef}
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                    />
                </label>

                <label className="add-page-modal__field">
                    <span>Type</span>
                    <select value={type} onChange={(event) => setType(event.target.value as PageType)}>
                        {PAGE_TYPES.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </label>

                <div className="add-page-modal__actions">
                    <button type="button" onClick={onCancel}>Cancel</button>
                    <button type="submit" disabled={!name.trim()}>Add</button>
                </div>
            </form>
        </Modal>
    )
}

export default AddPageModal
