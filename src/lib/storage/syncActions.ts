import type {ProviderId, StorageTarget} from './StorageProvider.ts'
import type {SyncStatus} from './sync.ts'
import type {NextcloudConnection} from './nextcloudProvider.ts'
import {webdavUrl} from './nextcloudProvider.ts'

// The file provider's target: its locator is ignored (the user picks a file each save/load).
const FILE_TARGET: StorageTarget = {provider: 'file', locator: '', label: 'File'}

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
export function resolveTarget(provider: ProviderId, connection: NextcloudConnection | null): StorageTarget | null {
    if (provider === 'file') return FILE_TARGET
    if (provider === 'nextcloud') {
        if (!connection) return null
        return {provider: 'nextcloud', locator: webdavUrl(connection), label: connection.label}
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
 * Whether the Save control is enabled for a provider at a status: the file provider (export) is always enabled; a cloud
 * provider gates on status (a save that would clobber a strictly-ahead remote, or a no-op up-to-date, is disabled).
 */
export function canSave(status: SyncStatus, probeable: boolean): boolean {
    if (!probeable) return true
    return status !== 'upToDate' && status !== 'remoteAhead'
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
