import type {LibrarySnapshot} from '@lib/storage/snapshot.ts'
import type {StorageProvider, StorageTarget} from './StorageProvider.ts'
import {
    extractMetadata,
    metadataLocator,
    parseSnapshot,
    serialiseInvalidatedMetadata,
    serialiseMetadata,
    serialiseSnapshot,
} from '@lib/storage/snapshotCodec.ts'
import {readRevisionWithFallback} from './revisionProbe.ts'
import {describeHttpFailure} from './httpError.ts'
import {parseShareUrl} from './nextcloudShare.ts'

/**
 * A Nextcloud connection: a public-share link, the library file's path within the shared folder, and a display label.
 * Held in memory and persisted device-locally in IndexedDB.
 */
export interface NextcloudConnection {
    shareUrl: string
    path: string
    label: string
}

// The currently adopted connection, or null when disconnected; hydrated from the connection store by the caller.
let active: NextcloudConnection | null = null

// Splits a file path into trimmed, URL-encoded, non-empty segments (slashes preserved as separators).
function pathSegments(path: string): string[] {
    return path.split('/').map((segment) => segment.trim()).filter((segment) => segment !== '').map(encodeURIComponent)
}

// The shared folder's public WebDAV root, e.g. https://cloud.example.com/public.php/dav/files/TOKEN (no trailing slash).
function webdavRoot(connection: NextcloudConnection): string {
    const {origin, token} = parseShareUrl(connection.shareUrl)
    return `${origin}/public.php/dav/files/${encodeURIComponent(token)}`
}

/**
 * Builds the absolute WebDAV URL of the library file for a connection, normalising slashes and encoding each segment.
 */
export function webdavUrl(connection: NextcloudConnection): string {
    return `${webdavRoot(connection)}/${pathSegments(connection.path).join('/')}`
}

/**
 * Builds the absolute WebDAV URL of an image at a relative path (e.g. `images/hero-a1.png`), placing the images folder
 * beside the library file — in the library file's own parent directory, not at the share root.
 */
export function imageUrl(connection: NextcloudConnection, path: string): string {
    const parent = pathSegments(connection.path).slice(0, -1)
    return [webdavRoot(connection), ...parent, ...pathSegments(path)].join('/')
}

// Matches each WebDAV `<href>` element's text, regardless of the server's namespace prefix (`d:href`, `D:href`, …).
const WEBDAV_HREF = /<[a-z0-9]*:?href>([^<]*)<\/[a-z0-9]*:?href>/gi

/**
 * Extracts the relative `images/<name>` paths from a WebDAV PROPFIND multi-status body, dropping the collection's own
 * entry; tolerates a body with no image entries (returns none).
 */
export function parseImageListing(xml: string): string[] {
    const paths: string[] = []
    for (const match of xml.matchAll(WEBDAV_HREF)) {
        // A file href ends in `/images/<name>`; the images collection's own href ends in `/images/` and is skipped.
        const file = decodeURIComponent(match[1]).match(/\/images\/([^/]+)$/)
        if (file) paths.push(`images/${file[1]}`)
    }
    return paths
}

/**
 * The ordered ancestor collection URLs of the target's parent path (e.g. `a`, then `a/b` for `a/b/library.json`), for
 * the recursive MKCOL walk; empty when the file sits directly at the WebDAV root.
 */
export function webdavParentUrls(connection: NextcloudConnection): string[] {
    const parents = pathSegments(connection.path).slice(0, -1)
    const urls: string[] = []
    let accumulated = webdavRoot(connection)
    for (const segment of parents) {
        accumulated = `${accumulated}/${segment}`
        urls.push(accumulated)
    }
    return urls
}

// The HTTP Basic authorization header value for a connection: the share token as the username, with an empty password.
function authHeader(connection: NextcloudConnection): string {
    const {token} = parseShareUrl(connection.shareUrl)
    return `Basic ${btoa(`${token}:`)}`
}

// Optional per-request relay settings: a body (text or binary) with its content type, and a WebDAV Depth header.
interface RelayOptions {
    body?: BodyInit
    contentType?: string
    depth?: string
}

// Forwards one WebDAV request through the same-origin relay, tagging the target, method, credentials, and optional
// depth; a text body defaults to JSON, a binary body passes its own content type through.
async function relay(method: string, url: string, connection: NextcloudConnection, options: RelayOptions = {}) {
    const headers: Record<string, string> = {
        'x-nc-url': url,
        'x-nc-method': method,
        authorization: authHeader(connection),
        // Nextcloud's public WebDAV endpoint rejects non-GET requests that lack this header with 401.
        'x-requested-with': 'XMLHttpRequest',
    }
    if (options.depth !== undefined) headers.depth = options.depth
    if (options.body !== undefined) headers['content-type'] = options.contentType ?? 'application/json'
    return fetch('/api/nextcloud', {method: 'POST', headers, body: options.body})
}

// A readable error message for a failed relay response, calling out the common rejected-share case.
function describeFailure(status: number): string {
    if (status === 401) return 'Nextcloud rejected the share link. Check the link and that the share allows editing.'
    return `Nextcloud request failed (${status}).`
}

/**
 * Sets the in-memory connection (or clears it with null); persistence is owned by the caller via the connection store.
 */
export function adoptConnection(connection: NextcloudConnection | null): void {
    active = connection
}

/**
 * The Nextcloud storage provider: relays WebDAV save/load/probe of the whole-library JSON through the same-origin relay,
 * using the adopted connection.
 */
export const nextcloudProvider: StorageProvider = {
    id: 'nextcloud',

    async connect() {
        if (!active) throw new Error('No Nextcloud connection to validate.')
        // Confirm reachability and credentials before touching anything (PROPFIND returns 207 Multi-Status on success).
        const probe = await relay('PROPFIND', webdavRoot(active), active, {depth: '0'})
        if (!probe.ok && probe.status !== 207) throw new Error(await describeHttpFailure(probe, describeFailure))
        // WebDAV MKCOL creates one level at a time, so walk the parent segments, tolerating collections that exist.
        for (const url of webdavParentUrls(active)) {
            const made = await relay('MKCOL', url, active)
            if (!made.ok && made.status !== 405 && made.status !== 301) {
                throw new Error(await describeHttpFailure(made, describeFailure))
            }
        }
    },

    isConnected() {
        return active !== null
    },

    async save(target: StorageTarget, snapshot: LibrarySnapshot) {
        if (!active) throw new Error('Not connected to Nextcloud.')
        const connection = active
        const put = async (locator: string, content: string) => {
            const response = await relay('PUT', locator, connection, {body: content})
            if (!response.ok) throw new Error(await describeHttpFailure(response, describeFailure))
        }
        // Invalidate the sidecar first, so a later-failing write never leaves it describing a stale revision; a probe
        // then falls back to the body. Then the body, then the sidecar describing it.
        await put(metadataLocator(target.locator), serialiseInvalidatedMetadata())
        await put(target.locator, serialiseSnapshot(snapshot))
        await put(metadataLocator(target.locator), serialiseMetadata(extractMetadata(snapshot)))
    },

    async load(target: StorageTarget) {
        if (!active) throw new Error('Not connected to Nextcloud.')
        const response = await relay('GET', target.locator, active)
        if (response.status === 404) return null
        if (!response.ok) throw new Error(await describeHttpFailure(response, describeFailure))
        return parseSnapshot(await response.text())
    },

    async readRevision(target: StorageTarget) {
        if (!active) return null
        const connection = active
        return readRevisionWithFallback(async (locator) => {
            const response = await relay('GET', locator, connection)
            if (response.status === 404) return null
            if (!response.ok) throw new Error(await describeHttpFailure(response, describeFailure))
            return response.text()
        }, target.locator)
    },

    async listImages() {
        if (!active) return []
        const response = await relay('PROPFIND', imageUrl(active, 'images'), active, {depth: '1'})
        // No images folder yet means no remote images.
        if (response.status === 404) return []
        if (!response.ok && response.status !== 207) throw new Error(await describeHttpFailure(response, describeFailure))
        return parseImageListing(await response.text())
    },

    async putImage(_target, path: string, bytes: Blob) {
        if (!active) throw new Error('Not connected to Nextcloud.')
        // Ensure the images collection exists first; MKCOL on an existing collection returns 405, which is fine.
        const made = await relay('MKCOL', imageUrl(active, 'images'), active)
        if (!made.ok && made.status !== 405 && made.status !== 301) {
            throw new Error(await describeHttpFailure(made, describeFailure))
        }
        const response = await relay('PUT', imageUrl(active, path), active, {
            body: bytes,
            contentType: bytes.type || 'application/octet-stream',
        })
        if (!response.ok) throw new Error(await describeHttpFailure(response, describeFailure))
    },

    async getImage(_target, path: string) {
        if (!active) return null
        const response = await relay('GET', imageUrl(active, path), active)
        if (response.status === 404) return null
        if (!response.ok) throw new Error(await describeHttpFailure(response, describeFailure))
        return response.blob()
    },

    async deleteImage(_target, path: string) {
        if (!active) return
        const response = await relay('DELETE', imageUrl(active, path), active)
        // Already gone is success for a delete.
        if (response.status === 404) return
        if (!response.ok) throw new Error(await describeHttpFailure(response, describeFailure))
    },
}
