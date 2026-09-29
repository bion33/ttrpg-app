import {useState} from 'react'
import {FolderOpen, Save, Settings} from 'lucide-react'
import IconButton from '../../ui/IconButton/IconButton'
import {useStorage} from '../../../hooks/useStorage.ts'
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
    const storage = useStorage()
    const [settingsOpen, setSettingsOpen] = useState(false)
    // Both placements sit against the left edge, so their hover labels open rightward.
    const labelSide = 'right'

    return (
        <>
            <div className={`storage-controls storage-controls--${placement} corner-cluster no-print`}>
                <IconButton icon={<Settings/>} label="Storage settings" labelSide={labelSide}
                            onClick={() => setSettingsOpen(true)}/>
                <IconButton icon={<FolderOpen/>} label="Load from file" labelSide={labelSide}
                            onClick={() => void storage.load()}/>
                <IconButton icon={<Save/>} label="Save to file" labelSide={labelSide}
                            onClick={() => void storage.save()}/>
            </div>

            {storage.activity !== 'idle' && (
                <div className={`storage-controls__toast storage-controls__toast--${placement} no-print`} role="status">
                    {storage.activity === 'saving' && 'Saving…'}
                    {storage.activity === 'saved' && 'Saved'}
                    {storage.activity === 'error' && (storage.error ?? 'Something went wrong.')}
                </div>
            )}

            {settingsOpen && (
                <StorageSettingsModal provider={storage.provider} onSelect={storage.setProvider}
                                      onClose={() => setSettingsOpen(false)}/>
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
