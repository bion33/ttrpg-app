import {useState} from 'react'
import {Trash2} from 'lucide-react'
import Modal from '@ui/Modal/Modal'
import IconButton from '@ui/IconButton/IconButton'
import ColorPicker from '@ui/ColorPicker/ColorPicker'
import ImageSourceForm from '@ui/ImageSourceModal/ImageSourceForm.tsx'
import {useImageSource} from '@hooks/useImageSource.ts'
import {useNameForm} from '@hooks/useNameForm.ts'
import {binderSpineColor} from '@lib/colors/hueColors.ts'
import './EditBinderModal.css'

// Preset hues offered as quick swatches for a binder spine, spaced around the wheel.
const PRESET_HUES = [8, 38, 90, 150, 200, 260, 320]

/**
 * Props for the edit-binder dialogue: the current label, hue, and portrait to seed the fields, and the save/cancel
 * callbacks.
 */
interface EditBinderModalProps {
    initialLabel: string
    initialHue: number
    initialPortrait: string
    onSave: (name: string, hue: number, portrait: string) => void
    onCancel: () => void
}

/**
 * Modal for editing a binder: renames the label (leaving the binder's id and stored pages untouched), recolours its
 * spine via a hue slider with swatch presets, and sets the cover portrait by swapping in the shared image-source form.
 */
function EditBinderModal({initialLabel, initialHue, initialPortrait, onSave, onCancel}: EditBinderModalProps) {
    const [hue, setHue] = useState(initialHue)
    const [portrait, setPortrait] = useState(initialPortrait)
    // Whether the image-source form has swapped in to replace the edit form while picking a portrait.
    const [choosingImage, setChoosingImage] = useState(false)
    // A loading local portrait falls back to the initial rather than a loader, matching the library shelf.
    const {src: portraitSource} = useImageSource(portrait)
    const {name, setName, nameReference, submit} = useNameForm(initialLabel, (trimmed) => onSave(trimmed, hue, portrait))

    if (choosingImage) {
        return (
            <Modal title="Binder portrait" onClose={onCancel}>
                <ImageSourceForm
                    onInsert={(value) => {
                        setPortrait(value)
                        setChoosingImage(false)
                    }}
                    onCancel={() => setChoosingImage(false)}
                />
            </Modal>
        )
    }

    return (
        <Modal title="Edit binder" onClose={onCancel}>
            <form className="modal__body" onSubmit={submit}>
                <div className="edit-binder__portrait-field">
                    <label className="modal__field edit-binder__name-column">
                        <span>Name</span>
                        <input ref={nameReference} type="text" maxLength={24} value={name}
                               onChange={(event) => setName(event.target.value)}/>
                    </label>
                    <div className="edit-binder__portrait-wrap">
                        <button type="button" className="edit-binder__portrait" onClick={() => setChoosingImage(true)}>
                            {portraitSource
                                ? <img className="edit-binder__portrait-image" src={portraitSource} alt=""/>
                                : (name.trim().charAt(0).toUpperCase() || '?')}
                        </button>
                        {portrait && (
                            <IconButton className="edit-binder__portrait-remove" icon={<Trash2/>}
                                        label="Remove portrait" variant="danger" size="small" appearance="flat"
                                        onClick={() => setPortrait('')}/>
                        )}
                    </div>
                </div>

                <ColorPicker hue={hue} onChange={setHue} presets={PRESET_HUES} preview={binderSpineColor}/>

                <div className="modal__actions">
                    <button type="button" className="modal__btn" onClick={onCancel}>Cancel</button>
                    <button type="submit" className="modal__btn modal__btn--primary" disabled={!name.trim()}>
                        Save
                    </button>
                </div>
            </form>
        </Modal>
    )
}

export default EditBinderModal
