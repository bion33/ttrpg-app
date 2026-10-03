import {useState} from 'react'
import AutosaveToggle from './AutosaveToggle.tsx'

/**
 * Props for the connected-state view: the connected target's label, the device-local autosave preference, and the
 * disconnect/close actions from `useStorage`.
 */
interface ConnectedViewProps {
    label: string
    autosaveEnabled: boolean
    onAutosaveChange: (enabled: boolean) => void
    onDisconnect: () => Promise<void>
    onClose: () => void
}

/**
 * The connected-state view shared by every storage connect form: the connected target, the autosave toggle, and a
 * Disconnect button (busy while the disconnect runs) beside Done.
 */
function ConnectedView({label, autosaveEnabled, onAutosaveChange, onDisconnect, onClose}: ConnectedViewProps) {
    const [busy, setBusy] = useState(false)

    return (
        <div className="modal__body">
            <p className="modal__prompt">Connected to {label}.</p>
            <AutosaveToggle enabled={autosaveEnabled} onChange={onAutosaveChange}/>
            <div className="modal__actions">
                <button
                    type="button"
                    className="modal__btn modal__btn--danger-outline"
                    disabled={busy}
                    onClick={() => {
                        setBusy(true)
                        void onDisconnect().finally(() => setBusy(false))
                    }}
                >
                    Disconnect
                </button>
                <button type="button" className="modal__btn modal__btn--primary" onClick={onClose}>Done</button>
            </div>
        </div>
    )
}

export default ConnectedView
