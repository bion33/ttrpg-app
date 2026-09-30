import {useState} from 'react'
import {ArrowLeft} from 'lucide-react'
import Modal from '../../../ui/Modal/Modal'
import type {ProviderId} from '../../../../lib/storage/StorageProvider.ts'
import type {NextcloudConnection} from '../../../../lib/storage/nextcloudProvider.ts'
import type {OneDriveConnection} from '../../../../lib/storage/onedriveProvider.ts'
import {isProviderAvailable} from '../../../../lib/storage/providers.ts'
import NextcloudConnectForm from './NextcloudConnectForm.tsx'
import OneDriveConnectForm from './OneDriveConnectForm.tsx'
import './StorageSettingsModal.css'

/** The providers offered in settings, in display order; availability is read from the registry. */
const PROVIDER_OPTIONS: {id: ProviderId; label: string; description: string}[] = [
    {id: 'file', label: 'File (import / export)', description: 'Save and load a JSON file you choose each time.'},
    {id: 'nextcloud', label: 'Nextcloud', description: 'Sync to a Nextcloud server.'},
    {id: 'onedrive', label: 'OneDrive', description: 'Sync to your Microsoft OneDrive.'},
    {id: 'googleDrive', label: 'Google Drive', description: 'Sync to your Google Drive.'},
]

/**
 * Props for the storage settings dialogue: the currently selected provider, the selection callback, and close.
 */
interface StorageSettingsModalProps {
    provider: ProviderId
    onSelect: (id: ProviderId) => void
    onClose: () => void
    nextcloudConnection: NextcloudConnection | null
    onConnectNextcloud: (connection: NextcloudConnection) => Promise<void>
    onDisconnectNextcloud: () => Promise<void>
    oneDriveConnection: OneDriveConnection | null
    onConnectOneDrive: () => Promise<void>
    onDisconnectOneDrive: () => Promise<void>
}

// The providers that open their own setup view instead of being selected inline from the list.
const SETUP_TITLES: Record<'nextcloud' | 'onedrive', string> = {nextcloud: 'Nextcloud', onedrive: 'OneDrive'}

/**
 * Modal for choosing the storage provider: shows the provider list, or — once a cloud provider is chosen — replaces the
 * body with its setup form, with a Back button returning to the list.
 */
function StorageSettingsModal({
    provider, onSelect, onClose, nextcloudConnection, onConnectNextcloud, onDisconnectNextcloud,
    oneDriveConnection, onConnectOneDrive, onDisconnectOneDrive,
}: StorageSettingsModalProps) {
    const [setupProvider, setSetupProvider] = useState<'nextcloud' | 'onedrive' | null>(null)

    // A cloud provider opens its own setup view; every other provider is selected inline from the list.
    const chooseProvider = (id: ProviderId) => {
        if (id === 'nextcloud' || id === 'onedrive') {
            setSetupProvider(id)
            return
        }
        onSelect(id)
    }

    if (setupProvider) {
        return (
            <Modal title={SETUP_TITLES[setupProvider]} onClose={onClose}>
                <div className="modal__body">
                    <button type="button" className="storage-settings__back" onClick={() => setSetupProvider(null)}>
                        <ArrowLeft size={16}/> Providers
                    </button>
                    {setupProvider === 'nextcloud' ? (
                        <NextcloudConnectForm
                            connection={nextcloudConnection}
                            onConnect={onConnectNextcloud}
                            onDisconnect={onDisconnectNextcloud}
                            onClose={onClose}
                        />
                    ) : (
                        <OneDriveConnectForm
                            connection={oneDriveConnection}
                            onConnect={onConnectOneDrive}
                            onDisconnect={onDisconnectOneDrive}
                            onClose={onClose}
                        />
                    )}
                </div>
            </Modal>
        )
    }

    return (
        <Modal title="Storage settings" onClose={onClose}>
            <div className="modal__body">
                <p className="modal__prompt">Choose where your library is saved.</p>
                <ul className="storage-settings__list">
                    {PROVIDER_OPTIONS.map((option) => {
                        const available = isProviderAvailable(option.id)
                        return (
                            <li key={option.id}>
                                <button
                                    type="button"
                                    className={`storage-settings__option${
                                        provider === option.id ? ' storage-settings__option--selected' : ''
                                    }`}
                                    disabled={!available}
                                    onClick={() => chooseProvider(option.id)}
                                >
                                    <span className="storage-settings__label">
                                        {option.label}
                                        {!available && <span className="storage-settings__badge">coming soon</span>}
                                    </span>
                                    <span className="storage-settings__description">{option.description}</span>
                                </button>
                            </li>
                        )
                    })}
                </ul>
                <div className="modal__actions">
                    <button type="button" className="modal__btn modal__btn--primary" onClick={onClose}>Done</button>
                </div>
            </div>
        </Modal>
    )
}

export default StorageSettingsModal
