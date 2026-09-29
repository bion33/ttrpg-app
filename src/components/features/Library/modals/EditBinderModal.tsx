import {type SyntheticEvent, useState} from 'react'
import './BinderModal.css'
import Modal from '../../../ui/Modal/Modal'

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
export function EditBinderModal({initialLabel, initialHue, onSave, onCancel}: EditBinderModalProps) {
    const [name, setName] = useState(initialLabel)
    const [hue, setHue] = useState(initialHue)

    // Validates the name, then reports the label and hue to the parent.
    function submit(event: SyntheticEvent) {
        event.preventDefault()
        const trimmed = name.trim()
        if (!trimmed) return
        onSave(trimmed, hue)
    }

    return (
        <Modal title="Edit binder" onClose={onCancel}>
            <form className="modal__body" onSubmit={submit}>
                <label className="modal__field">
                    <span>Name</span>
                    <input type="text" value={name} onChange={(event) => setName(event.target.value)}/>
                </label>

                <label className="modal__field">
                    <span>Color</span>
                    <input type="range" min={0} max={359} value={hue}
                           onChange={(event) => setHue(Number(event.target.value))}/>
                </label>
                <div className="binder-modal__presets">
                    {PRESET_HUES.map((preset) => (
                        <button key={preset} type="button" className="binder-modal__preset"
                                style={{background: `hsl(${preset} 45% 45%)`}} aria-label={`Hue ${preset}`}
                                onClick={() => setHue(preset)}/>
                    ))}
                </div>
                <div className="binder-modal__swatch" style={{background: `hsl(${hue} 45% 45%)`}}/>

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
