import {useState} from 'react'
import {FolderOpen, Save, Settings} from 'lucide-react'
import IconButton from '../../ui/IconButton/IconButton'
import {useStorageContext} from './storageContext.ts'
import {canLoad, canSave, isProbeable} from '../../../lib/storage/syncActions.ts'
import StorageSettingsModal from './modals/StorageSettingsModal.tsx'
import ConflictModal from './modals/ConflictModal.tsx'
import './StorageControls.css'

/**
 * Props for the storage controls: where they are mounted, which fixes their corner and the side their hover labels open
 * toward.
 */
interface StorageControlsProps {
    placement: 'binder' | 'library'
}

/**
 * The save/load/settings cluster wired to `useStorage`: exports the whole library to a file, imports one back (through
 * the conflict flow when it diverges from local edits), and opens the provider settings.
 */
function StorageControls({placement}: StorageControlsProps) {
    const storage = useStorageContext()
    const [settingsOpen, setSettingsOpen] = useState(false)
    // Both placements sit against the left edge, so their hover labels open rightward.
    const labelSide = 'right'

    // A never-configured device shows the settings once: it is open when the user opened it or the onboarding prompt is
    // active, and closing dismisses the prompt so it fires at most once per session.
    const settingsVisible = settingsOpen || storage.promptSettings
    const closeSettings = () => {
        setSettingsOpen(false)
        if (storage.promptSettings) storage.dismissSettingsPrompt()
    }

    const probeable = isProbeable(storage.provider)
    // A cloud provider with no connection has no target, so both controls are inert until it is connected.
    const ready = storage.provider === 'file'
        || (storage.provider === 'nextcloud' && storage.nextcloudConnection !== null)
        || (storage.provider === 'onedrive' && storage.oneDriveConnection !== null)
        || (storage.provider === 'googleDrive' && storage.googleDriveConnection !== null)
    // Save enables on local dirtiness alone (the click re-checks the remote and flags a conflict); load stays gated on
    // the sync status, since only a remote that is ahead or diverged can be pulled.
    const saveEnabled = ready && canSave(storage.dirty, probeable)
    const loadEnabled = ready && canLoad(storage.status, probeable)
    const saveLabel = storage.provider === 'file' ? 'Save to file' : 'Save'
    const loadLabel = storage.provider === 'file' ? 'Load from file' : 'Load'
    // Autosave/autoload governs only cloud providers, and when on it does the saving and loading — so the manual buttons
    // are redundant and hidden. File export/import has no autosave, so its buttons always show.
    const autosaveActive = probeable && storage.autosaveEnabled

    return (
        <>
            <div className={`storage-controls storage-controls--${placement} corner-cluster no-print`}>
                <IconButton icon={<Settings/>} label="Storage settings" labelSide={labelSide}
                            onClick={() => setSettingsOpen(true)}/>
                {!autosaveActive && (
                    <>
                        <IconButton icon={<FolderOpen/>} label={loadLabel} labelSide={labelSide} disabled={!loadEnabled}
                                    onClick={() => void storage.load()}/>
                        <IconButton icon={<Save/>} label={saveLabel} labelSide={labelSide}
                                    disabled={!saveEnabled || storage.saving}
                                    onClick={() => void storage.save()}/>
                    </>
                )}
            </div>

            {settingsVisible && (
                <StorageSettingsModal provider={storage.provider} onSelect={storage.setProvider}
                                      onClose={closeSettings}
                                      nextcloudConnection={storage.nextcloudConnection}
                                      onConnectNextcloud={storage.connectNextcloud}
                                      onDisconnectNextcloud={storage.disconnectNextcloud}
                                      oneDriveConnection={storage.oneDriveConnection}
                                      onConnectOneDrive={storage.connectOneDrive}
                                      onDisconnectOneDrive={storage.disconnectOneDrive}
                                      googleDriveConnection={storage.googleDriveConnection}
                                      onConnectGoogleDrive={storage.connectGoogleDrive}
                                      onDisconnectGoogleDrive={storage.disconnectGoogleDrive}
                                      autosaveEnabled={storage.autosaveEnabled}
                                      onAutosaveChange={(enabled) => void storage.setAutosaveEnabled(enabled)}/>
            )}
            {storage.conflict && (
                <ConflictModal
                    incomingSavedAt={storage.conflict.incoming.savedAt}
                    onKeepLocal={() => void storage.resolveConflict('keepLocal')}
                    onTakeOther={() => void storage.resolveConflict('takeOther')}
                />
            )}
        </>
    )
}

export default StorageControls
