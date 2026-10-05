import Modal from '@ui/Modal/Modal'
import ImageSourceForm from './ImageSourceForm.tsx'
import './ImageSourceModal.css'

/**
 * Props for the insert-image dialogue: it reports the chosen image — a remote http(s) URL or the relative path of an
 * uploaded local image — or a cancellation.
 */
interface ImageSourceModalProps {
    onInsert: (value: string) => void
    onCancel: () => void
}

/**
 * Modal dialogue for inserting an image by upload or URL: frames the image-source form in its own dialog.
 */
function ImageSourceModal({onInsert, onCancel}: ImageSourceModalProps) {
    return (
        <Modal title="Insert image" onClose={onCancel}>
            <ImageSourceForm onInsert={onInsert} onCancel={onCancel}/>
        </Modal>
    )
}

export default ImageSourceModal
