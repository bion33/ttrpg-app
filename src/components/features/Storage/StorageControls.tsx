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

    const probeable = isProbeable(storage.provider)
    // A cloud provider with no connection has no target, so both controls are inert until it is connected.
    const ready = storage.provider === 'file'
        || (storage.provider === 'nextcloud' && storage.nextcloudConnection !== null)
        || (storage.provider === 'onedrive' && storage.oneDriveConnection !== null)
    // Save enables on local dirtiness alone (the click re-checks the remote and flags a conflict); load stays gated on
    // the sync status, since only a remote that is ahead or diverged can be pulled.
    const saveEnabled = ready && canSave(storage.dirty, probeable)
    const loadEnabled = ready && canLoad(storage.status, probeable)
    const saveLabel = storage.provider === 'file' ? 'Save to file' : 'Save'
    const loadLabel = storage.provider === 'file' ? 'Load from file' : 'Load'

    return (
        <>
            <div className={`storage-controls storage-controls--${placement} corner-cluster no-print`}>
                <IconButton icon={<Settings/>} label="Storage settings" labelSide={labelSide}
                            onClick={() => setSettingsOpen(true)}/>
                <IconButton icon={<FolderOpen/>} label={loadLabel} labelSide={labelSide} disabled={!loadEnabled}
                            onClick={() => void storage.load()}/>
                <IconButton icon={<Save/>} label={saveLabel} labelSide={labelSide} disabled={!saveEnabled}
                            onClick={() => void storage.save()}/>
            </div>

            {settingsOpen && (
                <StorageSettingsModal provider={storage.provider} onSelect={storage.setProvider}
                                      onClose={() => setSettingsOpen(false)}
                                      nextcloudConnection={storage.nextcloudConnection}
                                      onConnectNextcloud={storage.connectNextcloud}
                                      onDisconnectNextcloud={storage.disconnectNextcloud}
                                      oneDriveConnection={storage.oneDriveConnection}
                                      onConnectOneDrive={storage.connectOneDrive}
                                      onDisconnectOneDrive={storage.disconnectOneDrive}/>
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
