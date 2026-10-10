import {useState} from 'react'
import {isHttpUrl} from '@lib/url/httpUrl.ts'
import {useNameForm} from '@hooks/useNameForm.ts'
import Modal from '@ui/Modal/Modal'
import type {LinkSelection} from './linkCommands.ts'

/**
 * Props for the link dialogue: the href and label it opens with (both empty for a new link), a report of the chosen
 * link, a request to drop the link, or a cancellation.
 */
interface LinkModalProps {
    initialUrl: string
    initialLabel: string
    onSubmit: (link: LinkSelection) => void
    onRemove: () => void
    onCancel: () => void
}

/**
 * Modal dialogue for adding or editing a hyperlink: an optional label field and a URL field reporting the entered
 * http(s) link, with a remove action when it opens on an existing link.
 */
function LinkModal({initialUrl, initialLabel, onSubmit, onRemove, onCancel}: LinkModalProps) {
    const [label, setLabel] = useState(initialLabel)
    const {name: url, setName: setUrl, nameReference, submit} = useNameForm(initialUrl, (trimmed) => {
        if (isHttpUrl(trimmed)) onSubmit({url: trimmed, label})
    })

    return (
        <Modal title={initialUrl ? 'Edit link' : 'Add link'} onClose={onCancel}>
            <form className="modal__body" onSubmit={submit}>
                <label className="modal__field">
                    <span>Label (optional):</span>
                    <input
                        type="text"
                        placeholder="Link text"
                        value={label}
                        onChange={(event) => setLabel(event.target.value)}
                    />
                </label>

                <label className="modal__field">
                    <span>Link to a URL:</span>
                    <input
                        ref={nameReference}
                        type="url"
                        placeholder="https://…"
                        value={url}
                        onChange={(event) => setUrl(event.target.value)}
                    />
                </label>

                <div className="modal__actions">
                    {initialUrl && (
                        <button type="button" className="modal__btn" onClick={onRemove}>Remove link</button>
                    )}
                    <button type="button" className="modal__btn" onClick={onCancel}>Cancel</button>
                    <button type="submit" className="modal__btn modal__btn--primary" disabled={!isHttpUrl(url.trim())}>
                        {initialUrl ? 'Save' : 'Add'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}

export default LinkModal
