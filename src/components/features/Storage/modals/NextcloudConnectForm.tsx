import {type SyntheticEvent, useState} from 'react'
import type {NextcloudConnection} from '../../../../lib/storage/nextcloudProvider.ts'

/**
 * Props for the Nextcloud connect form: the current connection (null when disconnected), and the connect/disconnect
 * actions from `useStorage`.
 */
interface NextcloudConnectFormProps {
    connection: NextcloudConnection | null
    onConnect: (connection: NextcloudConnection) => Promise<void>
    onDisconnect: () => Promise<void>
    onClose: () => void
}

// Builds the display label for a connection ("host / path"), falling back to the raw URL if it cannot be parsed.
function buildLabel(baseUrl: string, path: string): string {
    try {
        return `${new URL(baseUrl).hostname} > ${path}`
    } catch {
        return `${baseUrl} > ${path}`
    }
}

/**
 * The Nextcloud connection form inside the storage settings modal: collects the instance URL, username, app password,
 * and file path (each with guidance on where to find it), or shows the connected target with a Disconnect button.
 */
function NextcloudConnectForm({connection, onConnect, onDisconnect, onClose}: NextcloudConnectFormProps) {
    const [baseUrl, setBaseUrl] = useState('')
    const [username, setUsername] = useState('')
    const [appPassword, setAppPassword] = useState('')
    const [path, setPath] = useState('ttrpg-app.json')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (connection) {
        return (
            <div className="modal__body">
                <p className="modal__prompt">Connected to {connection.label}.</p>
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

    const submit = async (event: SyntheticEvent) => {
        event.preventDefault()
        const trimmedUrl = baseUrl.trim().replace(/\/+$/, '')
        const trimmedPath = path.trim()
        if (!trimmedUrl || !username.trim() || !appPassword || !trimmedPath) return
        setError(null)
        setBusy(true)
        try {
            await onConnect({
                baseUrl: trimmedUrl,
                username: username.trim(),
                appPassword,
                path: trimmedPath,
                label: buildLabel(trimmedUrl, trimmedPath),
            })
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Could not connect to Nextcloud.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <form className="modal__body" onSubmit={submit}>
            <label className="modal__field">
                <span>Instance URL</span>
                <input
                    type="url"
                    placeholder="https://cloud.example.com"
                    value={baseUrl}
                    onChange={(event) => setBaseUrl(event.target.value)}
                />
                <small className="storage-connect__hint">The address you open Nextcloud at, e.g. https://cloud.example.com</small>
            </label>

            <label className="modal__field">
                <span>Username</span>
                <input type="text" value={username} onChange={(event) => setUsername(event.target.value)}/>
                <small className="storage-connect__hint">Your Nextcloud login name.</small>
            </label>

            <label className="modal__field">
                <span>App password</span>
                <input type="password" value={appPassword} onChange={(event) => setAppPassword(event.target.value)}/>
                <small className="storage-connect__hint">
                    In Nextcloud click on Account &gt; Personal Settings &gt; Security, and scroll down to create a new app password. Do <strong>not</strong> use your account password.
                </small>
            </label>

            <label className="modal__field">
                <span>File path</span>
                <input type="text" value={path} onChange={(event) => setPath(event.target.value)}/>
                <small className="storage-connect__hint">Path to a file inside your Nextcloud Files. It's created if it doesn't exist.</small>
            </label>

            <p className="modal__prompt">
                Your instance URL, app password, and character data pass through this app's relay server on every save and load.
            </p>

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
