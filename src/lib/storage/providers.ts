import type {ProviderId, StorageProvider} from './StorageProvider.ts'
import {fileProvider} from './fileProvider.ts'
import {nextcloudProvider} from './nextcloudProvider.ts'

// The registered providers; later phases add their entries here — the registry is the single seam.
const PROVIDERS: Partial<Record<ProviderId, StorageProvider>> = {
    file: fileProvider,
    nextcloud: nextcloudProvider,
}

/** The provider registered under the given id, or throws when none is registered (not yet implemented). */
export function getProvider(id: ProviderId): StorageProvider {
    const provider = PROVIDERS[id]
    if (!provider) throw new Error(`No storage provider registered for "${id}"`)
    return provider
}

/** Whether a provider is registered (implemented) yet; the settings modal shows the rest as "coming soon". */
export function isProviderAvailable(id: ProviderId): boolean {
    return PROVIDERS[id] !== undefined
}
