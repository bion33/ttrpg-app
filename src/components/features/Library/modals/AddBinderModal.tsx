import {type SyntheticEvent, useEffect, useRef, useState} from 'react'
import Modal from '../../../ui/Modal/Modal'

/**
 * Props for the add-binder dialogue: it reports the chosen name, or a cancellation.
 */
interface AddBinderModalProps {
    onCreate: (name: string) => void
    onCancel: () => void
}

/**
 * Modal for adding a binder to the library: collects a name for the new binder.
 */
function AddBinderModal({onCreate, onCancel}: AddBinderModalProps) {
    const [name, setName] = useState('')
    const nameReference = useRef<HTMLInputElement>(null)

    useEffect(() => {
        nameReference.current?.focus()
    }, [])

    // Validates the name, then reports the new binder to the parent.
    function submit(event: SyntheticEvent) {
        event.preventDefault()
        const trimmed = name.trim()
        if (!trimmed) return
        onCreate(trimmed)
    }

    return (
        <Modal title="Add binder" onClose={onCancel}>
            <form className="modal__body" onSubmit={submit}>
                <p className="modal__prompt">
                    Add a binder to organise all information on a character in various pages and formats.
                </p>
                <label className="modal__field">
                    <span>Character name</span>
                    <input ref={nameReference} type="text" value={name}
                           onChange={(event) => setName(event.target.value)}/>
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

export default AddBinderModal
