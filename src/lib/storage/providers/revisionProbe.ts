import {metadataLocator, parseMetadata, parseSnapshot} from '@lib/storage/snapshotCodec.ts'

/**
 * Reads a snapshot's revision cheaply via its sidecar, falling back to the full body when the sidecar is absent or holds
 * the invalidation marker (a save in progress): returns the sidecar's revision, else the body's revision, else null when
 * both are absent. `readText` performs one provider transport read of the given locator, mapping a missing object to
 * null.
 */
export async function readRevisionWithFallback(
    readText: (locator: string) => Promise<string | null>,
    locator: string,
): Promise<string | null> {
    const sidecar = await readText(metadataLocator(locator))
    if (sidecar !== null) {
        const metadata = parseMetadata(sidecar)
        if (metadata !== null) return metadata.revision
    }
    const body = await readText(locator)
    return body === null ? null : parseSnapshot(body).revision
}
