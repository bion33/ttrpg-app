import {type SyntheticEvent, useState} from 'react'
import './TabModal.css'
import Modal from '../../../../ui/Modal/Modal'

/**
 * Props for the edit dialogue: the current label and hue to seed the fields, and the save/cancel callbacks.
 */
interface EditTabModalProps {
    initialLabel: string
    initialHue: number
    onSave: (name: string, hue: number) => void
    onCancel: () => void
}

// Preset hues offered as quick swatches, spaced around the wheel.
const PRESET_HUES = [38, 90, 150, 200, 260, 320]

/**
 * Modal for editing a tab: renames the label (leaving the tab's id and stored fields untouched) and recolours it
 * via a hue slider with swatch presets and a live preview of the resulting paper tab.
 */
export function EditTabModal({initialLabel, initialHue, onSave, onCancel}: EditTabModalProps) {
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
        <Modal title="Edit tab" onClose={onCancel}>
            <form className="modal__body" onSubmit={submit}>
                <label className="modal__field">
                    <span>Name</span>
                    <input type="text" maxLength={14} value={name}
                           onChange={(event) => setName(event.target.value)}/>
                </label>

                <label className="modal__field">
                    <span>Color</span>
                    <input type="range" min={0} max={359} value={hue}
                           onChange={(event) => setHue(Number(event.target.value))}/>
                </label>
                <div className="tab-modal__presets">
                    {PRESET_HUES.map((preset) => (
                        <button key={preset} type="button" className="tab-modal__preset"
                                style={{background: `hsl(${preset} 55% 82%)`}} aria-label={`Hue ${preset}`}
                                onClick={() => setHue(preset)}/>
                    ))}
                </div>
                <div className="tab-modal__swatch" style={{background: `hsl(${hue} 55% 82%)`}}/>

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
