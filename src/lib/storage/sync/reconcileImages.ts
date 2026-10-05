/**
 * The three image inventories a reconciliation compares: the paths a snapshot references, the paths present locally in
 * the OPFS, and the paths present in the provider's remote image folder.
 */
export interface ImageInventories {
    referenced: Set<string>
    local: Set<string>
    remote: Set<string>
}

/**
 * The actions that bring the local OPFS and the remote folder into line with what a snapshot references: images to
 * upload to the remote, download into the OPFS, delete from the remote, and GC from the OPFS.
 */
export interface ImageReconciliation {
    toUpload: string[]
    toDownload: string[]
    toDeleteRemote: string[]
    toDeleteLocal: string[]
}

// The elements of `source` kept by `predicate`, in the source's iteration order.
function filter(source: Iterable<string>, predicate: (path: string) => boolean): string[] {
    return [...source].filter(predicate)
}

/**
 * Decides the image sync actions from the three inventories, keyed on path identity alone (paths are unique per upload,
 * so a re-upload is a new path and no content hashing is needed):
 * - upload: referenced locally but missing from the remote;
 * - download: referenced remotely but missing from the local OPFS;
 * - delete remote: in the remote but no longer referenced;
 * - delete local: in the local OPFS but no longer referenced.
 */
export function reconcileImages({referenced, local, remote}: ImageInventories): ImageReconciliation {
    return {
        toUpload: filter(referenced, (path) => local.has(path) && !remote.has(path)),
        toDownload: filter(referenced, (path) => remote.has(path) && !local.has(path)),
        toDeleteRemote: filter(remote, (path) => !referenced.has(path)),
        toDeleteLocal: filter(local, (path) => !referenced.has(path)),
    }
}
