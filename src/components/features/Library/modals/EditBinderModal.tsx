import {useState} from 'react'
import Modal from '../../../ui/Modal/Modal'
import ColorPicker from '../../../ui/ColorPicker/ColorPicker'
import {useNameForm} from '../../../../hooks/useNameForm.ts'
import {binderSpineColor} from '../../../../lib/hueColors.ts'

// Preset hues offered as quick swatches for a binder spine, spaced around the wheel.
const PRESET_HUES = [8, 38, 90, 150, 200, 260, 320]

/**
 * Props for the edit-binder dialogue: the current label and hue to seed the fields, and the save/cancel callbacks.
 */
interface EditBinderModalProps {
    initialLabel: string
    initialHue: number
    onSave: (name: string, hue: number) => void
    onCancel: () => void
}

/**
 * Modal for editing a binder: renames the label (leaving the binder's id and stored pages untouched) and recolours
 * its spine via a hue slider with swatch presets and a live preview.
 */
function EditBinderModal({initialLabel, initialHue, onSave, onCancel}: EditBinderModalProps) {
    const [hue, setHue] = useState(initialHue)
    const {name, setName, nameReference, submit} = useNameForm(initialLabel, (trimmed) => onSave(trimmed, hue))

    return (
        <Modal title="Edit binder" onClose={onCancel}>
            <form className="modal__body" onSubmit={submit}>
                <label className="modal__field">
                    <span>Name</span>
                    <input ref={nameReference} type="text" maxLength={24} value={name}
                           onChange={(event) => setName(event.target.value)}/>
                </label>

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
