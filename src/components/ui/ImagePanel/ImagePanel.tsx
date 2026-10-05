import type {ReactNode} from 'react'
import {useState} from 'react'
import {createPortal} from 'react-dom'
import {ImagePlus, Trash2} from 'lucide-react'
import ActionMenu, {type ActionMenuItem} from '@ui/ActionMenu/ActionMenu'
import ImageSourceModal from '@ui/ImageSourceModal/ImageSourceModal'
import {useImageSource} from '@hooks/useImageSource.ts'
import './ImagePanel.css'

/**
 * Props for the image panel: the current image value ('' = none, otherwise a remote URL or a local image path), a
 * setter for it, the content to show in place of the image while none is set, and the panel shape ('circle' clips the
 * image to a disc filling the footprint).
 */
interface ImagePanelProps {
    imageUrl: string
    onChangeImage: (url: string) => void
    fallback?: ReactNode
    shape?: 'rectangle' | 'circle'
}

/**
 * The shared image surface: it shows the image when one is set, otherwise the `fallback`, with an always-present "…"
 * menu to add, change, or remove the image via the image-source dialog. Draws no `foreignObject`, so a field control
 * hosts it inside its own wrapper.
 */
function ImagePanel({imageUrl, onChangeImage, fallback, shape = 'rectangle'}: ImagePanelProps) {
    const [dialogOpen, setDialogOpen] = useState(false)
    // Resolves a local image path to a session blob URL, or passes a remote URL through; undefined while loading.
    const source = useImageSource(imageUrl)

    const actions: ActionMenuItem[] = [
        {
            id: 'setImage',
            label: imageUrl ? 'Change image' : 'Add image',
            icon: ImagePlus,
            run: () => setDialogOpen(true)
        },
    ]
    if (imageUrl) {
        actions.push({
            id: 'removeImage', label: 'Remove image', icon: Trash2, destructive: true,
            run: () => onChangeImage('')
        })
    }

    return (
        <div className={`image-panel image-panel--${shape}`}>
            {/* A thin row reserving space for the menu, so the content below never flows under the button. Both the row
                and the menu counter-scale the page zoom, so their on-screen sizes stay constant and matched. */}
            <div className="image-panel__toolbar">
                <div className="image-panel__menu">
                    <ActionMenu label="Image options" actions={actions}/>
                </div>
            </div>
            <div className="image-panel__content">
                {source
                    ? <img className="image-panel__image" src={source} alt=""/>
                    : fallback}
            </div>
            {dialogOpen && createPortal(
                <ImageSourceModal
                    onInsert={(value) => {
                        onChangeImage(value)
                        setDialogOpen(false)
                    }}
                    onCancel={() => setDialogOpen(false)}
                />,
                document.body,
            )}
        </div>
    )
}

export default ImagePanel
