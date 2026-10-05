import {useState} from 'react'
import {toast} from 'sonner'
import {Upload} from 'lucide-react'
import {isHttpUrl} from '@lib/url/httpUrl.ts'
import {IMAGE_STORAGE_UNAVAILABLE_MESSAGE, isImageStorageAvailable, storeImage} from '@lib/images/imageStore.ts'
import {errorMessage} from '@lib/errors/errorMessage.ts'
import {useNameForm} from '@hooks/useNameForm.ts'

/**
 * Props for the image-source form: it reports the chosen image — a remote http(s) URL or the relative path of a file
 * uploaded to local storage — or a cancellation.
 */
interface ImageSourceFormProps {
    onInsert: (value: string) => void
    onCancel: () => void
}

/**
 * The body of the insert-image dialogue: a file upload drop zone for a local image plus a URL field for a remote
 * http(s) address, either of which reports the value to insert.
 */
function ImageSourceForm({onInsert, onCancel}: ImageSourceFormProps) {
    const {name: url, setName: setUrl, nameReference, submit} = useNameForm('', (trimmed) => {
        if (isHttpUrl(trimmed)) onInsert(trimmed)
    })
    // Whether a drag is currently over the drop zone, so it can highlight; and whether an upload is in flight.
    const [dragActive, setDragActive] = useState(false)
    const [uploading, setUploading] = useState(false)

    // Stores a picked/dropped file locally and reports its path, surfacing any failure as a toast. Refuses when local
    // storage is unavailable, so a path that can never be backed by bytes is not inserted.
    async function upload(file: File) {
        if (!(await isImageStorageAvailable())) {
            toast.error(IMAGE_STORAGE_UNAVAILABLE_MESSAGE)
            return
        }
        setUploading(true)
        try {
            onInsert(await storeImage(file))
        } catch (caught) {
            toast.error(errorMessage(caught, 'Could not store the image.'))
        } finally {
            setUploading(false)
        }
    }

    // Takes the first image file from a drop, ignoring a drop that carries none.
    function onDrop(event: React.DragEvent) {
        event.preventDefault()
        setDragActive(false)
        const file = event.dataTransfer.files[0]
        if (file) void upload(file)
    }

    return (
        <form className="modal__body" onSubmit={submit}>

            <label className="modal__field">
                <span>Provide an image URL:</span>
                <input
                    ref={nameReference}
                    type="url"
                    placeholder="https://…"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                />
            </label>

            <label
                className={`image-source__drop${dragActive ? ' image-source__drop--active' : ''}`}
                onDragOver={(event) => {
                    event.preventDefault()
                    setDragActive(true)
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
            >
                <Upload size={20}/>
                <span>{uploading ? 'Uploading…' : 'Or drop an image / click to choose a file'}</span>
                <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) void upload(file)
                    }}
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

export default ImageSourceForm
