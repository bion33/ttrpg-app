import {useState} from 'react'
import type {OneDriveConnection} from '../../../../lib/storage/onedriveProvider.ts'

/**
 * Props for the OneDrive connect form: the current connection (null when disconnected) and the connect/disconnect
 * actions from `useStorage`. Connecting is interactive (a Microsoft sign-in popup), so there are no form fields.
 */
interface OneDriveConnectFormProps {
    connection: OneDriveConnection | null
    onConnect: () => Promise<void>
    onDisconnect: () => Promise<void>
    onClose: () => void
}

/**
 * The OneDrive connection view inside the storage settings modal: a disclosure plus a Connect button that opens the
 * Microsoft sign-in popup, or the connected state with a Disconnect button.
 */
function OneDriveConnectForm({connection, onConnect, onDisconnect, onClose}: OneDriveConnectFormProps) {
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (connection) {
        return (
            <div className="modal__body">
                <p className="modal__prompt">Connected to OneDrive.</p>
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

    const connect = async () => {
        setError(null)
        setBusy(true)
        try {
            await onConnect()
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Could not connect to OneDrive.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="modal__body">
            <p className="modal__prompt">
                You'll sign in with your Microsoft account in a popup window. This app never sees or stores which account
                you choose. A sign-in token is kept <strong>in this browser only</strong> (cleared with site data), and
                the access it grants is limited to this app's own OneDrive folder — it cannot read the rest of your drive.
            </p>

            {error && <p className="storage-connect__error">{error}</p>}

            <div className="modal__actions">
                <button type="button" className="modal__btn modal__btn--primary" disabled={busy} onClick={() => void connect()}>
                    {busy ? 'Connecting…' : 'Connect'}
                </button>
            </div>
        </div>
    )
}

export default OneDriveConnectForm
