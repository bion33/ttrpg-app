import {useState} from 'react'
import {useAtomValue} from 'jotai'
import {PAGE_TYPES, type PageType} from '@features/Binder/pageTypes.ts'
import {markdownTemplatesAtom} from '@features/Templates/templateAtoms.ts'
import {compareByLabel} from '@lib/sorting/compareByLabel.ts'
import {useNameForm} from '@hooks/useNameForm.ts'

/**
 * Props for the add-tab form: it reports the chosen name, type, and (for a markdown page) an optional markdown template
 * to seed its content from, or a cancellation.
 */
interface AddTabFormProps {
    onCreate: (name: string, type: PageType, markdownTemplateId?: string) => void
    onCancel: () => void
}

/**
 * The body of the add-tab dialogue (a name, a page type, and — for a Notes page — an optional markdown template),
 * rendered inside a modal that supplies the frame.
 */
function AddTabForm({onCreate, onCancel}: AddTabFormProps) {
    const [type, setType] = useState<PageType>(PAGE_TYPES[0].value)
    // Empty = a blank page; otherwise the markdown template whose content seeds the new page.
    const [markdownTemplateId, setMarkdownTemplateId] = useState('')
    // Offered in name order (case-insensitive); the stored order is left untouched.
    const markdownTemplates = [...useAtomValue(markdownTemplatesAtom)].sort(compareByLabel)
    const {name, setName, nameReference, submit} = useNameForm('', (trimmed) =>
        onCreate(trimmed, type, type === 'markdown' && markdownTemplateId ? markdownTemplateId : undefined))

    return (
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

            {type === 'markdown' && (
                <label className="modal__field">
                    <span>Template</span>
                    <select value={markdownTemplateId}
                            onChange={(event) => setMarkdownTemplateId(event.target.value)}>
                        <option value="">Blank</option>
                        {markdownTemplates.map((template) => (
                            <option key={template.id} value={template.id}>{template.label}</option>
                        ))}
                    </select>
                </label>
            )}

            <div className="modal__actions">
                <button type="button" className="modal__btn" onClick={onCancel}>Cancel</button>
                <button type="submit" className="modal__btn modal__btn--primary" disabled={!name.trim()}>
                    Add
                </button>
            </div>
        </form>
    )
}

export default AddTabForm
