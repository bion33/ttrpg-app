import Modal from '@ui/Modal/Modal'
import ImageUrlForm from './ImageUrlForm.tsx'

/**
 * Props for the insert-image dialogue: it reports the chosen image URL, or a cancellation.
 */
interface ImageUrlModalProps {
    onInsert: (url: string) => void
    onCancel: () => void
}

/**
 * Modal dialogue for inserting an image by URL: frames the image-URL form in its own dialog.
 */
function ImageUrlModal({onInsert, onCancel}: ImageUrlModalProps) {
    return (
        <Modal title="Insert image" onClose={onCancel}>
            <ImageUrlForm onInsert={onInsert} onCancel={onCancel}/>
        </Modal>
    )
}

export default ImageUrlModal
