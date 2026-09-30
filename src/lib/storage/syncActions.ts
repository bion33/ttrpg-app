import type {ProviderId, StorageTarget} from './StorageProvider.ts'
import type {SyncStatus} from './sync.ts'
import type {NextcloudConnection} from './nextcloudProvider.ts'
import {webdavUrl} from './nextcloudProvider.ts'
import type {OneDriveConnection} from './onedriveProvider.ts'
import type {GoogleDriveConnection} from './googleDriveProvider.ts'

// The file provider's target: its locator is ignored (the user picks a file each save/load).
const FILE_TARGET: StorageTarget = {provider: 'file', locator: '', label: 'File'}

// The fixed snapshot filename the cloud providers store under (consumed via target.locator).
const SNAPSHOT_FILENAME = 'ttrpg-app.json'

/** The cloud connections a target may resolve from; additive as providers are added, so no per-provider parameter list. */
export interface CloudConnections {
    nextcloud: NextcloudConnection | null
    oneDrive: OneDriveConnection | null
    googleDrive: GoogleDriveConnection | null
}

/**
 * Whether a provider's remote revision can be fetched silently: true for every provider except the file provider, which
 * needs the user to pick a file and so cannot be probed.
 */
export function isProbeable(provider: ProviderId): boolean {
    return provider !== 'file'
}

/**
 * The target to act on for the active provider, or null when a cloud provider is selected but not yet connected (its
 * Save/Load controls are then disabled).
 */
export function resolveTarget(provider: ProviderId, connections: CloudConnections): StorageTarget | null {
    if (provider === 'file') return FILE_TARGET
    if (provider === 'nextcloud') {
        const connection = connections.nextcloud
        if (!connection) return null
        return {provider: 'nextcloud', locator: webdavUrl(connection), label: connection.label}
    }
    if (provider === 'onedrive') {
        const connection = connections.oneDrive
        if (!connection) return null
        return {provider: 'onedrive', locator: SNAPSHOT_FILENAME, label: connection.label}
    }
    if (provider === 'googleDrive') {
        const connection = connections.googleDrive
        if (!connection) return null
        return {provider: 'googleDrive', locator: SNAPSHOT_FILENAME, label: connection.label}
    }
    return null
}

/**
 * The remote revision to feed evaluateSync: the real probed revision for a probeable provider, else the sync base
 * (the file provider's substitution, since it cannot probe — status then reflects local dirtiness only).
 */
export function chooseRemoteRevision(input: {
    probeable: boolean
    probedRevision: string | null
    baseRevision: string | null
}): string | null {
    return input.probeable ? input.probedRevision : input.baseRevision
}

/**
 * Whether the Save control is enabled: the file provider (export) is always enabled; a cloud provider gates only on
 * local dirtiness, decoupled from the remote probe — save() re-checks the remote and routes a conflict at click time.
 */
export function canSave(dirty: boolean, probeable: boolean): boolean {
    if (!probeable) return true
    return dirty
}

/**
 * Whether the Load control is enabled for a provider at a status: the file provider (import) is always enabled; a cloud
 * provider gates on status (only a remote that is ahead of, or diverged from, the local base can be loaded).
 */
export function canLoad(status: SyncStatus, probeable: boolean): boolean {
    if (!probeable) return true
    return status === 'remoteAhead' || status === 'diverged'
}

/**
 * What save() should do before writing: 'conflict' for a probeable provider whose remote is ahead or diverged (route
 * through the conflict modal instead of clobbering), else 'write'.
 */
export function saveIntent(status: SyncStatus, probeable: boolean): 'write' | 'conflict' {
    if (probeable && (status === 'remoteAhead' || status === 'diverged')) return 'conflict'
    return 'write'
}

/**
 * What an automatic save should do at a status: 'write' when the remote is safe to overwrite from this device,
 * 'conflict' when local and remote have diverged (route to the conflict modal, never clobber), else 'idle'. Enabled and
 * probeable must both hold, and a clean (not dirty) library is always idle.
 */
export function autosaveIntent(input: {
    status: SyncStatus
    probeable: boolean
    enabled: boolean
    dirty: boolean
}): 'write' | 'conflict' | 'idle' {
    if (!input.enabled || !input.probeable || !input.dirty) return 'idle'
    if (input.status === 'diverged') return 'conflict'
    if (input.status === 'localAhead' || input.status === 'noRemote' || input.status === 'remoteMissing') return 'write'
    return 'idle'
}

/**
 * What automatic catch-up should do at a status: 'load' when the remote is cleanly ahead of a non-dirty local base,
 * 'conflict' when local edits sit on a stale base (diverged), else 'idle'. Enabled and probeable must both hold.
 */
export function autoloadIntent(input: {
    status: SyncStatus
    probeable: boolean
    enabled: boolean
}): 'load' | 'conflict' | 'idle' {
    if (!input.enabled || !input.probeable) return 'idle'
    if (input.status === 'remoteAhead') return 'load'
    if (input.status === 'diverged') return 'conflict'
    return 'idle'
}
