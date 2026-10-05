import type {LibrarySnapshot} from '@lib/storage/snapshot.ts'

/** The set of storage backends a target can name; phase 1 ships only the file provider. */
export type ProviderId = 'file' | 'nextcloud' | 'onedrive' | 'googleDrive'

/**
 * An opaque, serialisable handle to "where" a library is stored: which provider, a provider-specific locator, and a
 * label for the UI.
 */
export interface StorageTarget {
    provider: ProviderId
    locator: string
    label: string
}

/**
 * One storage backend behind a uniform interface: connect/pick lifecycle, save/load of a whole-library snapshot, and a
 * cheap remote-revision probe used to detect divergence before downloading.
 */
export interface StorageProvider {
    readonly id: ProviderId

    connect(): Promise<void>

    isConnected(): boolean

    save(target: StorageTarget, snapshot: LibrarySnapshot): Promise<void>

    load(target: StorageTarget): Promise<LibrarySnapshot | null>

    readRevision(target: StorageTarget): Promise<string | null>

    // The per-file image-folder operations backing cloud image sync. Absent on a provider with no live folder (the file
    // provider, which bundles images into its export zip instead); each path is the image's relative `images/…` key.
    listImages?(target: StorageTarget): Promise<string[]>

    putImage?(target: StorageTarget, path: string, bytes: Blob): Promise<void>

    getImage?(target: StorageTarget, path: string): Promise<Blob | null>

    deleteImage?(target: StorageTarget, path: string): Promise<void>
}
