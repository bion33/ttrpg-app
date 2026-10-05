import Modal from '@ui/Modal/Modal'

/**
 * Props for the conflict dialogue: the incoming file's save time, and the two resolutions — keep this device's current
 * state, or take (apply) the incoming file, discarding local changes.
 */
interface ConflictModalProps {
    incomingSavedAt: string
    onKeepLocal: () => void
    onTakeOther: () => void
}

// Formats an ISO timestamp for display, falling back to the raw value if it cannot be parsed.
function formatSavedAt(iso: string): string {
    const date = new Date(iso)
    return Number.isNaN(date.getTime()) ? iso : date.toLocaleString()
}

/**
 * Modal shown when a load diverges from unsaved local edits: it explains the conflict, shows the incoming file's save
 * time, and offers keeping this device's changes or taking the other device's file (discarding local changes). Closing
 * it (backdrop or Escape) keeps local changes, the safe default.
 */
function ConflictModal({incomingSavedAt, onKeepLocal, onTakeOther}: ConflictModalProps) {
    return (
        <Modal title="Conflicting changes" onClose={onKeepLocal}>
            <div className="modal__body">
                <p className="modal__prompt">
                    Could not load remote changes because you have made recent changes while there are different changes
                    in the remote save (saved {formatSavedAt(incomingSavedAt)}).
                </p>
                <p>
                    <strong>Take remote</strong> will replace everything on this device.<br/>
                    <strong>Keep local</strong> will replace the remote save with your local changes.
                </p>
                <div className="modal__actions">
                    <button type="button" className="modal__btn modal__btn--danger" onClick={onTakeOther}>
                        Take remote
                    </button>
                    <button type="button" className="modal__btn modal__btn--primary" onClick={onKeepLocal}>
                        Keep local
                    </button>
                </div>
            </div>
        </Modal>
    )
}

export default ConflictModal
