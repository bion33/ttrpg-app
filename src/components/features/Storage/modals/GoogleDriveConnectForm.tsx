import type {GoogleDriveConnection} from '../../../../lib/storage/googleDriveProvider.ts'
import CloudConnectForm from './CloudConnectForm.tsx'

/**
 * Props for the Google Drive connect form: the current connection (null when disconnected) and the connect/disconnect
 * actions from `useStorage`. Connecting is interactive (a Google sign-in popup), so there are no form fields.
 */
interface GoogleDriveConnectFormProps {
    connection: GoogleDriveConnection | null
    onConnect: () => Promise<void>
    onDisconnect: () => Promise<void>
    onClose: () => void
    autosaveEnabled: boolean
    onAutosaveChange: (enabled: boolean) => void
}

/**
 * The Google Drive connection view inside the storage settings modal: the shared cloud connect view with Google Drive's
 * label and disclosure copy.
 */
function GoogleDriveConnectForm({
    connection, onConnect, onDisconnect, onClose, autosaveEnabled, onAutosaveChange,
}: GoogleDriveConnectFormProps) {
    return (
        <CloudConnectForm
            connected={connection !== null}
            connectedLabel="Google Drive"
            connectErrorFallback="Could not connect to Google Drive."
            autosaveEnabled={autosaveEnabled}
            onAutosaveChange={onAutosaveChange}
            disclosure={
                <>
                    You'll sign in with your Google account in a popup window. This app never sees or stores which
                    account you choose. A sign-in token is kept <strong>in this browser only</strong> (cleared with site
                    data), and the access it grants does not allow it to read or write to the rest of your Drive.
                </>
            }
            onConnect={onConnect}
            onDisconnect={onDisconnect}
            onClose={onClose}
        />
    )
}

export default GoogleDriveConnectForm
