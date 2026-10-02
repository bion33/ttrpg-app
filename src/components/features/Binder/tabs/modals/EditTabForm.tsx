import {useState} from 'react'
import ColorPicker from '@ui/ColorPicker/ColorPicker'
import {useNameForm} from '@hooks/useNameForm.ts'
import {tabColor} from '@lib/colors/hueColors.ts'

// Preset hues offered as quick swatches, spaced around the wheel.
const PRESET_HUES = [38, 90, 150, 200, 260, 320]

/**
 * Props for the edit-tab form: the current label and hue to seed the fields, and the save/cancel callbacks.
 */
interface EditTabFormProps {
    initialLabel: string
    initialHue: number
    onSave: (name: string, hue: number) => void
    onCancel: () => void
}

/**
 * The body of the edit-tab dialogue (a name field and a hue slider with swatch presets and a live tab preview),
 * rendered inside a modal that supplies the frame.
 */
function EditTabForm({initialLabel, initialHue, onSave, onCancel}: EditTabFormProps) {
    const [hue, setHue] = useState(initialHue)
    const {name, setName, nameReference, submit} = useNameForm(initialLabel, (trimmed) => onSave(trimmed, hue))

    return (
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
    )
}

export default EditTabForm
