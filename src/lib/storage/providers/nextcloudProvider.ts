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

// Forwards one WebDAV request through the same-origin relay, tagging the target, method, credentials, and optional depth.
async function relay(
    method: string,
    url: string,
    connection: NextcloudConnection,
    body?: string,
    depth?: string,
): Promise<Response> {
    const headers: Record<string, string> = {
        'x-nc-url': url,
        'x-nc-method': method,
        authorization: authHeader(connection),
        // Nextcloud's public WebDAV endpoint rejects non-GET requests that lack this header with 401.
        'x-requested-with': 'XMLHttpRequest',
    }
    if (depth !== undefined) headers.depth = depth
    if (body !== undefined) headers['content-type'] = 'application/json'
    return fetch('/api/nextcloud', {method: 'POST', headers, body})
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
        const probe = await relay('PROPFIND', webdavRoot(active), active, undefined, '0')
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
            const response = await relay('PUT', locator, connection, content)
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
}
