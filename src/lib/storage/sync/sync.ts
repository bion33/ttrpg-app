/**
 * The sync relationship between local state and a storage target's remote document, derived from lineage (revisions),
 * never clocks: up to date, local ahead, remote ahead, diverged (conflict), no remote yet, or a remote gone missing.
 */
export type SyncStatus = 'upToDate' | 'localAhead' | 'remoteAhead' | 'diverged' | 'noRemote' | 'remoteMissing'

/**
 * The inputs to a sync decision: the remote document's revision (null when absent), the revision the local state
 * descends from (null when this target was never synced), and whether local state has changed since that base.
 */
export interface SyncInput {
    remoteRevision: string | null
    baseRevision: string | null
    dirty: boolean
}

/**
 * Decides the sync status by comparing the remote revision to the base revision the local state descends from, combined
 * with whether local state is dirty; a pure implementation of the plan's conflict truth table.
 */
export function evaluateSync({remoteRevision, baseRevision, dirty}: SyncInput): SyncStatus {
    // No remote document: either never created, or deleted out from under a target we had synced.
    if (remoteRevision === null) {
        return baseRevision === null ? 'noRemote' : 'remoteMissing'
    }
    // Remote exists but we have never synced this target: a clean local state can load it; a dirty one conflicts.
    if (baseRevision === null) {
        return dirty ? 'diverged' : 'remoteAhead'
    }
    // Remote is still the state we descend from: only local edits set us apart.
    if (remoteRevision === baseRevision) {
        return dirty ? 'localAhead' : 'upToDate'
    }
    // Remote moved on: a clean local state can load it; a dirty one conflicts.
    return dirty ? 'diverged' : 'remoteAhead'
}
