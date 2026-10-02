import {useNameForm} from '@hooks/useNameForm.ts'

/**
 * Props for the name form: an optional seed name (for a rename), the submit button's label, and the submit/cancel
 * callbacks.
 */
interface NameFormProps {
    initialName?: string
    submitLabel: string
    onSubmit: (name: string) => void
    onCancel: () => void
}

/**
 * The body of a single-field name dialogue (collecting a trimmed name), rendered inside a modal that is swapping its
 * body — shared by the template managers for add and rename.
 */
function NameForm({initialName = '', submitLabel, onSubmit, onCancel}: NameFormProps) {
    const {name, setName, nameReference, submit} = useNameForm(initialName, onSubmit)

    return (
        <form className="modal__body" onSubmit={submit}>
            <label className="modal__field">
                <span>Name</span>
                <input ref={nameReference} type="text" maxLength={24} value={name}
                       onChange={(event) => setName(event.target.value)}/>
            </label>

            <div className="modal__actions">
                <button type="button" className="modal__btn" onClick={onCancel}>Cancel</button>
                <button type="submit" className="modal__btn modal__btn--primary" disabled={!name.trim()}>
                    {submitLabel}
                </button>
            </div>
        </form>
    )
}

export default NameForm
