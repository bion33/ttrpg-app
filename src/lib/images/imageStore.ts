import {buildImagePath} from './imageKey.ts'

/**
 * Thin glue over the Origin Private File System (OPFS) for image bytes: uploaded images are written under a relative
 * `images/<slug>-<id>.<ext>` path that doubles as the field value, markdown link target, cloud filename, and zip entry.
 * Every operation degrades gracefully when OPFS is unavailable or a file is missing, so a reader never throws.
 */

// Subscribers notified when bytes are written at a path, so a mounted <img> can re-resolve an image that arrived after
// it first rendered (e.g. downloaded from the cloud during a background sync).
type ImageWriteListener = (path: string) => void
const writeListeners = new Set<ImageWriteListener>()

/**
 * Subscribes to image-write notifications, returning an unsubscribe. The listener is called with the path each time its
 * bytes are (re)written, whether by upload or by a background download.
 */
export function subscribeToImageWrites(listener: ImageWriteListener): () => void {
    writeListeners.add(listener)
    return () => writeListeners.delete(listener)
}

// A short, URL-safe unique suffix distinguishing two uploads of the same filename.
function shortId(): string {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 8)
}

// The OPFS root directory, or null when it is unavailable (so callers degrade instead of throwing). getDirectory is
// present but throws a SecurityError outside a secure context (a non-HTTPS, non-localhost origin), so the call itself
// must be guarded, not just its presence.
async function opfsRoot(): Promise<FileSystemDirectoryHandle | null> {
    if (!navigator.storage?.getDirectory) return null
    try {
        return await navigator.storage.getDirectory()
    } catch {
        return null
    }
}

/**
 * The message shown when local image storage is unavailable, so the failure is explained rather than a silent missing
 * image. Shared by every caller so the wording stays in one place.
 */
export const IMAGE_STORAGE_UNAVAILABLE_MESSAGE =
    'This browser can’t store images: local image storage (OPFS) is blocked in private/incognito windows and on insecure origins (non-HTTPS, non-localhost). Images won’t upload or load here.'

/**
 * Whether local image storage (OPFS) is usable here. It is unavailable outside a secure context — a non-HTTPS,
 * non-localhost origin (e.g. a LAN IP over http) — where uploaded or downloaded image bytes cannot be persisted.
 */
export async function isImageStorageAvailable(): Promise<boolean> {
    return (await opfsRoot()) !== null
}

// Resolves the directory handle for a path's parent, creating the chain when `create` is set, or null when a segment is
// missing (read) or OPFS is unavailable. Returns the leaf filename alongside its containing directory.
async function resolveParent(
    path: string,
    create: boolean,
): Promise<{directory: FileSystemDirectoryHandle; fileName: string} | null> {
    const root = await opfsRoot()
    if (!root) return null
    const segments = path.split('/').filter((segment) => segment !== '')
    if (segments.length === 0) return null
    const fileName = segments[segments.length - 1]
    let directory = root
    try {
        for (const segment of segments.slice(0, -1)) {
            directory = await directory.getDirectoryHandle(segment, {create})
        }
    } catch {
        return null
    }
    return {directory, fileName}
}

/**
 * Writes a blob's bytes to the OPFS at the given relative path, creating the directory chain; a no-op when OPFS is
 * unavailable. Used by upload (via storeImage) and by import (zip/cloud download).
 */
export async function writeImageBytes(path: string, bytes: Blob): Promise<void> {
    const parent = await resolveParent(path, true)
    if (!parent) return
    const fileHandle = await parent.directory.getFileHandle(parent.fileName, {create: true})
    const writable = await fileHandle.createWritable()
    await writable.write(bytes)
    await writable.close()
    for (const listener of writeListeners) listener(path)
}

/**
 * Stores an uploaded file in the OPFS under a fresh `images/<slug>-<id>.<ext>` path and returns that path — the stable
 * key held by the field/markdown value.
 */
export async function storeImage(file: File): Promise<string> {
    const path = buildImagePath(file.name, shortId())
    await writeImageBytes(path, file)
    return path
}

/**
 * Reads the image stored at the given relative path, or null when it is missing or OPFS is unavailable.
 */
export async function readImage(path: string): Promise<Blob | null> {
    const parent = await resolveParent(path, false)
    if (!parent) return null
    try {
        const fileHandle = await parent.directory.getFileHandle(parent.fileName)
        return await fileHandle.getFile()
    } catch {
        return null
    }
}

/**
 * Deletes the image stored at the given relative path; a no-op when it is already absent or OPFS is unavailable.
 */
export async function deleteImage(path: string): Promise<void> {
    const parent = await resolveParent(path, false)
    if (!parent) return
    try {
        await parent.directory.removeEntry(parent.fileName)
    } catch {
        // Already gone, or OPFS rejected the removal — nothing to clean up either way.
    }
}

/**
 * Lists the relative paths of every image currently in the OPFS `images/` folder; empty when the folder or OPFS is
 * absent.
 */
export async function listImages(): Promise<string[]> {
    const root = await opfsRoot()
    if (!root) return []
    let folder: FileSystemDirectoryHandle
    try {
        folder = await root.getDirectoryHandle('images')
    } catch {
        return []
    }
    const paths: string[] = []
    // OPFS directory handles are async-iterable over [name, handle] pairs for their entries.
    for await (const [name, handle] of folder as unknown as AsyncIterable<[string, FileSystemHandle]>) {
        if (handle.kind === 'file') paths.push(`images/${name}`)
    }
    return paths
}
