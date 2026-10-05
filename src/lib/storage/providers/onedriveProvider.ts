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
import {createOAuthTokenClient} from '@lib/storage/oauth/oauthTokenClient.ts'
import {describeHttpFailure} from './httpError.ts'

/**
 * A OneDrive connection: a long-lived refresh token (persisted device-locally in IndexedDB, rotated on each refresh) and
 * a generic display label. The short-lived access token is never persisted — it is fetched on demand and held in memory.
 */
export interface OneDriveConnection {
    refreshToken: string
    label: string
}

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'

// The shared connection/access-token machinery, bound to Microsoft's relay refresh endpoint and messages.
const tokenClient = createOAuthTokenClient<OneDriveConnection>({
    refreshEndpoint: '/api/oauth/microsoft/refresh',
    notConnectedMessage: 'Not connected to OneDrive.',
    expiredMessage: 'OneDrive sign-in has expired. Reconnect in storage settings.',
})
const {withAccessToken} = tokenClient

/**
 * Sets the in-memory OneDrive connection (or clears it with null) and the optional change callback used to persist a
 * rotated refresh token; persistence itself is owned by the caller. Drops any cached access token.
 */
export const adoptConnection = tokenClient.adopt

/**
 * The Graph URL for the named app-folder file's content (download/upload of the library JSON itself); the app-folder
 * scope confines the path to the application's own OneDrive folder. The filename is owned by the target's locator.
 */
export function contentUrl(fileName: string): string {
    return `${GRAPH_BASE}/me/drive/special/approot:/${fileName}:/content`
}

/**
 * The Graph URL for the app-folder item at a relative path (the item itself, for delete), as opposed to its content.
 */
export function itemUrl(path: string): string {
    return `${GRAPH_BASE}/me/drive/special/approot:/${path}`
}

/**
 * The Graph URL listing the children of the app-folder's `images` subfolder.
 */
export function imageChildrenUrl(): string {
    return `${GRAPH_BASE}/me/drive/special/approot:/images:/children?$select=name,file`
}

// A readable error message for a failed Graph response.
function describeFailure(status: number): string {
    if (status === 401 || status === 403) return 'OneDrive rejected the request. Reconnect in storage settings.'
    return `OneDrive request failed (${status}).`
}

/**
 * The OneDrive storage provider: saves, loads, and probes the whole-library JSON in the app's own OneDrive folder via
 * Microsoft Graph, refreshing the access token (and rotating the stored refresh token) as needed.
 */
export const onedriveProvider: StorageProvider = {
    id: 'onedrive',

    async connect() {
        if (!tokenClient.getConnection()) throw new Error('No OneDrive connection to validate.')
        // One authenticated GET both validates the token and lazily creates the app folder.
        const response = await withAccessToken((token) =>
            fetch(`${GRAPH_BASE}/me/drive/special/approot`, {headers: {authorization: `Bearer ${token}`}}))
        if (!response.ok) throw new Error(await describeHttpFailure(response, describeFailure))
    },

    isConnected() {
        return tokenClient.getConnection() !== null
    },

    async save(target: StorageTarget, snapshot: LibrarySnapshot) {
        const put = async (fileName: string, content: string) => {
            const response = await withAccessToken((token) =>
                fetch(contentUrl(fileName), {
                    method: 'PUT',
                    headers: {authorization: `Bearer ${token}`, 'content-type': 'application/json'},
                    body: content,
                }))
            if (!response.ok) throw new Error(await describeHttpFailure(response, describeFailure))
        }
        // Invalidate the sidecar first, so a later-failing write never leaves it describing a stale revision; a probe
        // then falls back to the body. Then the body, then the sidecar describing it.
        await put(metadataLocator(target.locator), serialiseInvalidatedMetadata())
        await put(target.locator, serialiseSnapshot(snapshot))
        await put(metadataLocator(target.locator), serialiseMetadata(extractMetadata(snapshot)))
    },

    async load(target: StorageTarget) {
        const response = await withAccessToken((token) =>
            fetch(contentUrl(target.locator), {headers: {authorization: `Bearer ${token}`}}))
        if (response.status === 404) return null
        if (!response.ok) throw new Error(await describeHttpFailure(response, describeFailure))
        return parseSnapshot(await response.text())
    },

    async readRevision(target: StorageTarget) {
        if (!tokenClient.getConnection()) return null
        // The in-file revision GUID (not Graph's eTag/cTag) is what save() mints and compares against.
        return readRevisionWithFallback(async (locator) => {
            const response = await withAccessToken((token) =>
                fetch(contentUrl(locator), {headers: {authorization: `Bearer ${token}`}}))
            if (response.status === 404) return null
            if (!response.ok) throw new Error(await describeHttpFailure(response, describeFailure))
            return response.text()
        }, target.locator)
    },

    async listImages() {
        const response = await withAccessToken((token) =>
            fetch(imageChildrenUrl(), {headers: {authorization: `Bearer ${token}`}}))
        // No images folder yet means no remote images.
        if (response.status === 404) return []
        if (!response.ok) throw new Error(await describeHttpFailure(response, describeFailure))
        const {value} = await response.json() as { value: { name: string; file?: unknown }[] }
        return value.filter((entry) => entry.file !== undefined).map((entry) => `images/${entry.name}`)
    },

    async putImage(_target, path: string, bytes: Blob) {
        const response = await withAccessToken((token) =>
            fetch(contentUrl(path), {
                method: 'PUT',
                headers: {authorization: `Bearer ${token}`, 'content-type': bytes.type || 'application/octet-stream'},
                body: bytes,
            }))
        if (!response.ok) throw new Error(await describeHttpFailure(response, describeFailure))
    },

    async getImage(_target, path: string) {
        const response = await withAccessToken((token) =>
            fetch(contentUrl(path), {headers: {authorization: `Bearer ${token}`}}))
        if (response.status === 404) return null
        if (!response.ok) throw new Error(await describeHttpFailure(response, describeFailure))
        return response.blob()
    },

    async deleteImage(_target, path: string) {
        const response = await withAccessToken((token) =>
            fetch(itemUrl(path), {method: 'DELETE', headers: {authorization: `Bearer ${token}`}}))
        // Already gone is success for a delete.
        if (response.status === 404) return
        if (!response.ok) throw new Error(await describeHttpFailure(response, describeFailure))
    },
}
