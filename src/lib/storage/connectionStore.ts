import {createStore, del, get, set} from 'idb-keyval'
import type {ProviderId} from './StorageProvider.ts'
import type {NextcloudConnection} from './nextcloudProvider.ts'

/**
 * Device-local sync state for the active target: the revision the local library descends from and its hash at that
 * moment. Kept out of the snapshot (it is per device, not per library), so it lives in IndexedDB.
 */
export interface SyncState {
    baseRevision: string | null
    baseHash: string | null
}

// A dedicated IndexedDB store so this device-local state never mixes with anything else on the origin.
const store = createStore('dnd-storage', 'connection')

const SYNC_STATE_KEY = 'syncState'
const ACTIVE_PROVIDER_KEY = 'activeProvider'
const NEXTCLOUD_KEY = 'nextcloudConnection'

/** The sync state for the active target, or a never-synced default when none has been stored yet. */
export async function loadSyncState(): Promise<SyncState> {
    return (await get<SyncState>(SYNC_STATE_KEY, store)) ?? {baseRevision: null, baseHash: null}
}

/** Persists the sync state after a successful save or load. */
export async function saveSyncState(state: SyncState): Promise<void> {
    await set(SYNC_STATE_KEY, state, store)
}

/** The id of the provider the user last selected, or null when none has been chosen. */
export async function loadActiveProvider(): Promise<ProviderId | null> {
    return (await get<ProviderId>(ACTIVE_PROVIDER_KEY, store)) ?? null
}

/** Persists the selected provider id, or clears it when null. */
export async function saveActiveProvider(id: ProviderId | null): Promise<void> {
    if (id === null) {
        await del(ACTIVE_PROVIDER_KEY, store)
        return
    }
    await set(ACTIVE_PROVIDER_KEY, id, store)
}

/** The stored Nextcloud connection (instance URL, credentials, path), or null when none is connected. */
export async function loadNextcloudConnection(): Promise<NextcloudConnection | null> {
    return (await get<NextcloudConnection>(NEXTCLOUD_KEY, store)) ?? null
}

/** Persists the Nextcloud connection after a successful connect. */
export async function saveNextcloudConnection(connection: NextcloudConnection): Promise<void> {
    await set(NEXTCLOUD_KEY, connection, store)
}

/** Clears the stored Nextcloud connection on disconnect. */
export async function clearNextcloudConnection(): Promise<void> {
    await del(NEXTCLOUD_KEY, store)
}
