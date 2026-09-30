import {useState} from 'react'
import {ArrowLeft} from 'lucide-react'
import Modal from '../../../ui/Modal/Modal'
import type {ProviderId} from '../../../../lib/storage/StorageProvider.ts'
import type {NextcloudConnection} from '../../../../lib/storage/nextcloudProvider.ts'
import {isProviderAvailable} from '../../../../lib/storage/providers.ts'
import NextcloudConnectForm from './NextcloudConnectForm.tsx'
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
}

/**
 * Modal for choosing the storage provider: shows the provider list, or — once Nextcloud is chosen — replaces the body
 * with its setup form, with a Back button returning to the list.
 */
function StorageSettingsModal({
    provider, onSelect, onClose, nextcloudConnection, onConnectNextcloud, onDisconnectNextcloud,
}: StorageSettingsModalProps) {
    const [setupProvider, setSetupProvider] = useState<'nextcloud' | null>(null)

    // Nextcloud opens its own setup view; every other provider is selected inline from the list.
    const chooseProvider = (id: ProviderId) => {
        if (id === 'nextcloud') {
            setSetupProvider('nextcloud')
            return
        }
        onSelect(id)
    }

    if (setupProvider === 'nextcloud') {
        return (
            <Modal title="Nextcloud" onClose={onClose}>
                <div className="modal__body">
                    <button type="button" className="storage-settings__back" onClick={() => setSetupProvider(null)}>
                        <ArrowLeft size={16}/> Providers
                    </button>
                    <NextcloudConnectForm
                        connection={nextcloudConnection}
                        onConnect={onConnectNextcloud}
                        onDisconnect={onDisconnectNextcloud}
                    />
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
