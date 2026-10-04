import {type SyntheticEvent, useState} from 'react'
import type {NextcloudConnection} from '@lib/storage/providers/nextcloudProvider.ts'
import {parseShareUrl} from '@lib/storage/providers/nextcloudShare.ts'
import ConnectedView from './ConnectedView.tsx'
import {errorMessage} from '@lib/errors/errorMessage.ts'

/**
 * Props for the Nextcloud connect form: the current connection (null when disconnected), the connect/disconnect actions
 * from `useStorage`, and the device-local autosave preference shown once connected.
 */
interface NextcloudConnectFormProps {
    connection: NextcloudConnection | null
    onConnect: (connection: NextcloudConnection) => Promise<void>
    onDisconnect: () => Promise<void>
    onClose: () => void
    autosaveEnabled: boolean
    onAutosaveChange: (enabled: boolean) => void
}

// Builds the display label for a connection ("host > path"), falling back to the raw URL if it cannot be parsed.
function buildLabel(shareUrl: string, path: string): string {
    try {
        return `${new URL(shareUrl).hostname} > ${path}`
    } catch {
        return `${shareUrl} > ${path}`
    }
}

/**
 * The Nextcloud connection form inside the storage settings modal: collects a public-share link and the file path
 * within the shared folder, or shows the connected target with a Disconnect button.
 */
function NextcloudConnectForm({
                                  connection, onConnect, onDisconnect, onClose, autosaveEnabled, onAutosaveChange,
                              }: NextcloudConnectFormProps) {
    const [shareUrl, setShareUrl] = useState('')
    const [path, setPath] = useState('ttrpg-app.json')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (connection) {
        return (
            <ConnectedView
                label={connection.label}
                autosaveEnabled={autosaveEnabled}
                onAutosaveChange={onAutosaveChange}
                onDisconnect={onDisconnect}
                onClose={onClose}
            />
        )
    }

    const submit = async (event: SyntheticEvent) => {
        event.preventDefault()
        const trimmedUrl = shareUrl.trim()
        const trimmedPath = path.trim()
        if (!trimmedUrl || !trimmedPath) return
        setError(null)
        // Reject a malformed share link before attempting to connect.
        try {
            parseShareUrl(trimmedUrl)
        } catch (caught) {
            setError(errorMessage(caught, 'Not a valid Nextcloud share link.'))
            return
        }
        setBusy(true)
        try {
            await onConnect({
                shareUrl: trimmedUrl,
                path: trimmedPath,
                label: buildLabel(trimmedUrl, trimmedPath),
            })
        } catch (caught) {
            setError(errorMessage(caught, 'Could not connect to Nextcloud.'))
        } finally {
            setBusy(false)
        }
    }

    return (
        <form className="modal__body" onSubmit={submit}>
            <label className="modal__field">
                <span>Share link</span>
                <input
                    type="url"
                    placeholder="https://cloud.example.com/s/…"
                    value={shareUrl}
                    onChange={(event) => setShareUrl(event.target.value)}
                />
                <small className="storage-connect__hint">
                    In Nextcloud, share a folder as a public link with <strong>Allow editing</strong> (create, edit, and
                    delete) enabled, then paste the link here.
                </small>
            </label>

            <label className="modal__field">
                <span>File path</span>
                <input type="text" value={path} onChange={(event) => setPath(event.target.value)}/>
                <small className="storage-connect__hint">Path to a file inside the shared folder. It's created if it
                    doesn't exist.</small>
            </label>

            {error && <p className="storage-connect__error">{error}</p>}

            <div className="modal__actions">
                <button type="submit" className="modal__btn modal__btn--primary" disabled={busy}>
                    {busy ? 'Connecting…' : 'Connect'}
                </button>
            </div>
        </form>
    )
}

export default NextcloudConnectForm
