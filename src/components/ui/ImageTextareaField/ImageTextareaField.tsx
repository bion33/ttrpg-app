import {useState} from 'react'
import {useAtom} from 'jotai'
import {createPortal} from 'react-dom'
import {ImagePlus, Trash2} from 'lucide-react'
import type {ImageTextareaNode} from '@type/FieldNode.ts'
import ActionMenu, {type ActionMenuItem} from '@ui/ActionMenu/ActionMenu'
import FieldForeignObject from '@ui/FieldForeignObject/FieldForeignObject'
import SheetTextarea from '@ui/AutoFitTextarea/SheetTextarea'
import ImageUrlModal from '@ui/ImageUrlModal/ImageUrlModal'
import './ImageTextareaField.css'

/**
 * A field that holds either a prose description or a single image. It shows the image when one is set, otherwise an
 * auto-fitting textarea, with an always-present "…" menu to add, change, or remove the image (via the image-URL
 * dialog). The text and the image URL persist independently, so switching between them never loses the other.
 */
function ImageTextareaField({node}: { node: ImageTextareaNode }) {
    const [text, setText] = useAtom(node.atom)
    const [imageUrl, setImageUrl] = useAtom(node.imageUrlAtom)
    const [dialogOpen, setDialogOpen] = useState(false)

    const actions: ActionMenuItem[] = [
        {id: 'setImage', label: imageUrl ? 'Change image' : 'Add image', icon: ImagePlus, run: () => setDialogOpen(true)},
    ]
    if (imageUrl) {
        actions.push({id: 'removeImage', label: 'Remove image', icon: Trash2, destructive: true,
            run: () => setImageUrl('')})
    }

    return (
        <FieldForeignObject field={node.definition}>
            <div className="image-textarea">
                {/* A thin row reserving space for the menu, so the content below never flows under the button. Both the
                    row and the menu counter-scale the page zoom, so their on-screen sizes stay constant and matched. */}
                <div className="image-textarea__toolbar">
                    <div className="image-textarea__menu">
                        <ActionMenu label="Image options" actions={actions}/>
                    </div>
                </div>
                <div className="image-textarea__content">
                    {imageUrl
                        ? <img className="image-textarea__image" src={imageUrl} alt=""/>
                        : <SheetTextarea field={node.definition} value={text} onChange={setText}/>}
                </div>
            </div>
            {dialogOpen && createPortal(
                <ImageUrlModal
                    onInsert={(url) => {
                        setImageUrl(url)
                        setDialogOpen(false)
                    }}
                    onCancel={() => setDialogOpen(false)}
                />,
                document.body,
            )}
        </FieldForeignObject>
    )
}

export default ImageTextareaField
