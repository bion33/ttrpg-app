import {useState} from 'react'
import Modal from '@ui/Modal/Modal'
import ColorPicker from '@ui/ColorPicker/ColorPicker'
import {useNameForm} from '@hooks/useNameForm.ts'
import {tabColor} from '@lib/colors/hueColors.ts'

// Preset hues offered as quick swatches, spaced around the wheel.
const PRESET_HUES = [38, 90, 150, 200, 260, 320]

/**
 * Props for the edit dialogue: the current label and hue to seed the fields, and the save/cancel callbacks.
 */
interface EditTabModalProps {
    initialLabel: string
    initialHue: number
    onSave: (name: string, hue: number) => void
    onCancel: () => void
}

/**
 * Modal for editing a tab: renames the label (leaving the tab's id and stored fields untouched) and recolours it
 * via a hue slider with swatch presets and a live preview of the resulting paper tab.
 */
function EditTabModal({initialLabel, initialHue, onSave, onCancel}: EditTabModalProps) {
    const [hue, setHue] = useState(initialHue)
    const {name, setName, nameReference, submit} = useNameForm(initialLabel, (trimmed) => onSave(trimmed, hue))

    return (
        <Modal title="Edit tab" onClose={onCancel}>
            <form className="modal__body" onSubmit={submit}>
                <label className="modal__field">
                    <span>Name</span>
                    <input ref={nameReference} type="text" maxLength={14} value={name}
                           onChange={(event) => setName(event.target.value)}/>
                </label>

                <ColorPicker hue={hue} onChange={setHue} presets={PRESET_HUES} preview={tabColor}/>

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

export default EditTabModal
