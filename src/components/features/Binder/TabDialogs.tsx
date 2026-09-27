import {useEffect, useRef, useState, type SyntheticEvent} from 'react'
import './TabDialogs.css'
import Modal from '../../ui/Modal/Modal'

/**
 * Props for the rename dialogue: the current label to seed the field, and the save/cancel callbacks.
 */
interface RenameTabModalProps {
    initial: string
    onSave: (name: string) => void
    onCancel: () => void
}

/**
 * Modal for renaming a tab: edits the label only, leaving the tab's id (and stored fields) untouched.
 */
export function RenameTabModal({initial, onSave, onCancel}: RenameTabModalProps) {
    const [name, setName] = useState(initial)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        inputRef.current?.select()
    }, [])

    // Validates the name, then reports it to the parent.
    function submit(event: SyntheticEvent) {
        event.preventDefault()
        const trimmed = name.trim()
        if (!trimmed) return
        onSave(trimmed)
    }

    return (
        <Modal title="Rename tab" onClose={onCancel}>
            <form className="modal__body" onSubmit={submit}>
                <label className="modal__field">
                    <span>Name</span>
                    <input ref={inputRef} type="text" value={name}
                           onChange={(event) => setName(event.target.value)}/>
                </label>
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

/**
 * Props for the recolour dialogue: the current hue to seed the picker, and the save/cancel callbacks.
 */
interface ColorTabModalProps {
    initial: number
    onSave: (hue: number) => void
    onCancel: () => void
}

// Preset hues offered as quick swatches, spaced around the wheel.
const PRESET_HUES = [38, 90, 150, 200, 260, 320]

/**
 * Modal for recolouring a tab: a hue slider with swatch presets and a live preview of the resulting paper tab.
 */
export function ColorTabModal({initial, onSave, onCancel}: ColorTabModalProps) {
    const [hue, setHue] = useState(initial)

    return (
        <Modal title="Tab colour" onClose={onCancel}>
            <div className="modal__body">
                <div className="tab-dialog__swatch" style={{background: `hsl(${hue} 55% 82%)`}}/>
                <div className="tab-dialog__presets">
                    {PRESET_HUES.map((preset) => (
                        <button key={preset} type="button" className="tab-dialog__preset"
                                style={{background: `hsl(${preset} 55% 82%)`}} aria-label={`Hue ${preset}`}
                                onClick={() => setHue(preset)}/>
                    ))}
                </div>
                <label className="modal__field">
                    <span>Hue</span>
                    <input type="range" min={0} max={359} value={hue}
                           onChange={(event) => setHue(Number(event.target.value))}/>
                </label>
                <div className="modal__actions">
                    <button type="button" className="modal__btn" onClick={onCancel}>Cancel</button>
                    <button type="button" className="modal__btn modal__btn--primary" onClick={() => onSave(hue)}>
                        Save
                    </button>
                </div>
            </div>
        </Modal>
    )
}

/**
 * Props for the delete confirmation: the label of the tab at risk, and the confirm/cancel callbacks.
 */
interface DeleteTabModalProps {
    label: string
    onConfirm: () => void
    onCancel: () => void
}

/**
 * Modal confirming a tab's deletion, warning that the page and its saved fields are removed.
 */
export function DeleteTabModal({label, onConfirm, onCancel}: DeleteTabModalProps) {
    return (
        <Modal title="Delete tab" onClose={onCancel}>
            <div className="modal__body">
                <p className="tab-dialog__prompt">
                    Delete “{label}”? Its page and everything saved on it are removed. This cannot be undone.
                </p>
                <div className="modal__actions">
                    <button type="button" className="modal__btn" onClick={onCancel}>Cancel</button>
                    <button type="button" className="modal__btn modal__btn--danger" onClick={onConfirm}>Delete</button>
                </div>
            </div>
        </Modal>
    )
}
