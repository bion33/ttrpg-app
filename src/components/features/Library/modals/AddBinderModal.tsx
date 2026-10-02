import {useState} from 'react'
import {useAtomValue} from 'jotai'
import Modal from '@ui/Modal/Modal'
import {useNameForm} from '@hooks/useNameForm.ts'
import {binderTemplatesAtom} from '@features/Templates/templateAtoms.ts'
import {compareByLabel} from '@lib/sorting/compareByLabel.ts'

/**
 * Props for the add-binder dialogue: it reports the chosen name and the optional binder template to build from, or a
 * cancellation.
 */
interface AddBinderModalProps {
    onCreate: (name: string, fromTemplateId?: string) => void
    onCancel: () => void
}

/**
 * Modal for adding a binder to the library: collects a name and an optional binder template to create its tabs from.
 */
function AddBinderModal({onCreate, onCancel}: AddBinderModalProps) {
    // Empty = an empty binder; otherwise the binder template whose structure the new binder is built from.
    const [fromTemplateId, setFromTemplateId] = useState('')
    // Offered in name order (case-insensitive); the stored order is left untouched.
    const binderTemplates = [...useAtomValue(binderTemplatesAtom)].sort(compareByLabel)
    const {name, setName, nameReference, submit} = useNameForm('', (trimmed) =>
        onCreate(trimmed, fromTemplateId || undefined))

    return (
        <Modal title="Add binder" onClose={onCancel}>
            <form className="modal__body" onSubmit={submit}>
                <p className="modal__prompt">
                    Add a binder to organise all information on a character in various pages and formats.
                </p>
                <label className="modal__field">
                    <span>Character name</span>
                    <input ref={nameReference} type="text" maxLength={24} value={name}
                           onChange={(event) => setName(event.target.value)}/>
                </label>

                <label className="modal__field">
                    <span>Create from</span>
                    <select value={fromTemplateId} onChange={(event) => setFromTemplateId(event.target.value)}>
                        <option value="">Empty</option>
                        {binderTemplates.map((template) => (
                            <option key={template.id} value={template.id}>{template.label}</option>
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

export default AddBinderModal
