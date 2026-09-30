import {type ReactNode, useState} from 'react'

/**
 * Props for the shared cloud connect view: whether a connection exists, the connected label, the provider-specific
 * disclosure copy, the fallback error message, and the connect/disconnect/close actions from `useStorage`.
 */
interface CloudConnectFormProps {
    connected: boolean
    connectedLabel: string
    disclosure: ReactNode
    connectErrorFallback: string
    onConnect: () => Promise<void>
    onDisconnect: () => Promise<void>
    onClose: () => void
}

/**
 * The shared OAuth cloud connection view inside the storage settings modal: a disclosure plus a Connect button that
 * opens the provider's sign-in popup, or the connected state with a Disconnect button. Both OneDrive and Google Drive
 * connect interactively (no form fields), so they differ only in their label and disclosure copy.
 */
function CloudConnectForm({
    connected, connectedLabel, disclosure, connectErrorFallback, onConnect, onDisconnect, onClose,
}: CloudConnectFormProps) {
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (connected) {
        return (
            <div className="modal__body">
                <p className="modal__prompt">Connected to {connectedLabel}.</p>
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
            setError(caught instanceof Error ? caught.message : connectErrorFallback)
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="modal__body">
            <p className="modal__prompt">{disclosure}</p>

            {error && <p className="storage-connect__error">{error}</p>}

            <div className="modal__actions">
                <button type="button" className="modal__btn modal__btn--primary" disabled={busy} onClick={() => void connect()}>
                    {busy ? 'Connecting…' : 'Connect'}
                </button>
            </div>
        </div>
    )
}

export default CloudConnectForm
