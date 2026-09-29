import Modal from '../../../ui/Modal/Modal'
import type {ProviderId} from '../../../../lib/storage/StorageProvider.ts'
import {isProviderAvailable} from '../../../../lib/storage/providers.ts'
import './StorageSettingsModal.css'

/** The providers offered in settings, in display order; availability is read from the registry. */
const PROVIDER_OPTIONS: {id: ProviderId; label: string; description: string}[] = [
    {id: 'file', label: 'File (import / export)', description: 'Save and load a JSON file you choose each time.'},
    {id: 'nextcloud', label: 'Nextcloud', description: 'Sync to your own Nextcloud server.'},
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
}

/**
 * Modal for choosing the storage provider: lists every provider, with the unimplemented ones disabled as "coming soon".
 * The seam later phases extend with per-provider connect forms and their security disclosures.
 */
function StorageSettingsModal({provider, onSelect, onClose}: StorageSettingsModalProps) {
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
                                    onClick={() => onSelect(option.id)}
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
