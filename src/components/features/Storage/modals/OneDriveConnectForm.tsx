import type {OneDriveConnection} from '@lib/storage/providers/onedriveProvider.ts'
import CloudConnectForm from './CloudConnectForm.tsx'

/**
 * Props for the OneDrive connect form: the current connection (null when disconnected) and the connect/disconnect
 * actions from `useStorage`. Connecting is interactive (a Microsoft sign-in popup), so there are no form fields.
 */
interface OneDriveConnectFormProps {
    connection: OneDriveConnection | null
    onConnect: () => Promise<void>
    onDisconnect: () => Promise<void>
    onClose: () => void
    autosaveEnabled: boolean
    onAutosaveChange: (enabled: boolean) => void
}

/**
 * The OneDrive connection view inside the storage settings modal: the shared cloud connect view with OneDrive's label
 * and disclosure copy.
 */
function OneDriveConnectForm({
                                 connection, onConnect, onDisconnect, onClose, autosaveEnabled, onAutosaveChange,
                             }: OneDriveConnectFormProps) {
    return (
        <CloudConnectForm
            connected={connection !== null}
            connectedLabel="OneDrive"
            connectErrorFallback="Could not connect to OneDrive."
            autosaveEnabled={autosaveEnabled}
            onAutosaveChange={onAutosaveChange}
            disclosure={
                <>
                    You'll sign in with your Microsoft account in a popup window. This app never sees or stores which
                    account you choose. A sign-in token is kept <strong>in this browser only</strong> (cleared with site
                    data), and the access it grants does not allow it to read or write to the rest of your drive.
                </>
            }
            onConnect={onConnect}
            onDisconnect={onDisconnect}
            onClose={onClose}
        />
    )
}

export default OneDriveConnectForm
