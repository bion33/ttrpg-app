import {isHttpUrl} from '@lib/url/httpUrl.ts'
import {useNameForm} from '@hooks/useNameForm.ts'

/**
 * Props for the image-URL form: it reports the chosen image URL, or a cancellation.
 */
interface ImageUrlFormProps {
    onInsert: (url: string) => void
    onCancel: () => void
}

/**
 * The body of the insert-image dialogue: a single URL field accepting only an http(s) address, rendered inside a modal
 * that supplies the frame.
 */
function ImageUrlForm({onInsert, onCancel}: ImageUrlFormProps) {
    const {name: url, setName: setUrl, nameReference, submit} = useNameForm('', (trimmed) => {
        if (isHttpUrl(trimmed)) onInsert(trimmed)
    })

    return (
        <form className="modal__body" onSubmit={submit}>
            <label className="modal__field">
                <span>Image URL</span>
                <input
                    ref={nameReference}
                    type="url"
                    placeholder="https://…"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                />
            </label>

            <div className="modal__actions">
                <button type="button" className="modal__btn" onClick={onCancel}>Cancel</button>
                <button type="submit" className="modal__btn modal__btn--primary" disabled={!isHttpUrl(url.trim())}>
                    Insert
                </button>
            </div>
        </form>
    )
}

export default ImageUrlForm
