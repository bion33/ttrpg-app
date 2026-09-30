import type {LibrarySnapshot} from '../snapshot.ts'
import type {StorageProvider, StorageTarget} from './StorageProvider.ts'
import {parseSnapshot, serialiseSnapshot} from './fileProvider.ts'

/**
 * A OneDrive connection: a long-lived refresh token (persisted device-locally in IndexedDB, rotated on each refresh) and
 * a generic display label. The short-lived access token is never persisted — it is fetched on demand and held in memory.
 */
export interface OneDriveConnection {
    refreshToken: string
    label: string
}

// The fixed app-folder file name; the app-folder scope confines every path to the application's own OneDrive folder.
const FILE_NAME = 'ttrpg-app.json'
// The Graph app-folder path prefix for the library file, shared by the content and metadata URL builders.
const APPROOT_FILE = `me/drive/special/approot:/${FILE_NAME}:`
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'

// The currently adopted connection, or null when disconnected; hydrated from the connection store by the caller.
let active: OneDriveConnection | null = null
// Invoked with a rotated connection so the caller can persist a refreshed token; the provider owns no persistence.
let onConnectionChange: ((connection: OneDriveConnection) => void) | null = null
// The cached access token and its absolute expiry (ms epoch); dropped whenever the connection changes.
let accessToken: {value: string; expiresAt: number} | null = null

/**
 * The Graph URL for the app-folder file's content (download/upload of the library JSON itself).
 */
export function contentUrl(): string {
    return `${GRAPH_BASE}/${APPROOT_FILE}/content`
}

/**
 * Sets the in-memory connection (or clears it with null) and the optional change callback used to persist a rotated
 * refresh token; persistence itself is owned by the caller. Drops any cached access token so the new connection is used.
 */
export function adoptConnection(
    connection: OneDriveConnection | null,
    onChange?: (connection: OneDriveConnection) => void,
): void {
    active = connection
    onConnectionChange = connection ? (onChange ?? null) : null
    accessToken = null
}

// Refreshes the access token via the OAuth relay, updating the in-memory token and rotating the stored refresh token.
async function refreshAccessToken(): Promise<string> {
    if (!active) throw new Error('Not connected to OneDrive.')
    const response = await fetch('/api/oauth/microsoft/refresh', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({refreshToken: active.refreshToken}),
    })
    if (!response.ok) throw new Error('OneDrive sign-in has expired. Reconnect in storage settings.')
    const tokens = await response.json() as {access_token: string; refresh_token?: string; expires_in?: number}
    // Expire ~60s early so a token never lapses mid-request.
    accessToken = {value: tokens.access_token, expiresAt: Date.now() + ((tokens.expires_in ?? 3600) - 60) * 1000}
    // Microsoft rotates the refresh token on every refresh; persist the new one through the caller's change callback.
    if (tokens.refresh_token && active) {
        active = {...active, refreshToken: tokens.refresh_token}
        onConnectionChange?.(active)
    }
    return accessToken.value
}

// Runs an authenticated Graph request with a valid access token, refreshing first if the cached one is absent or stale.
async function withAccessToken(request: (token: string) => Promise<Response>): Promise<Response> {
    const token = accessToken && accessToken.expiresAt > Date.now() ? accessToken.value : await refreshAccessToken()
    const response = await request(token)
    // A 401 despite a fresh token means it was revoked/expired server-side; refresh once and retry.
    if (response.status === 401) return request(await refreshAccessToken())
    return response
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
        if (!active) throw new Error('No OneDrive connection to validate.')
        // One authenticated GET both validates the token and lazily creates the app folder.
        const response = await withAccessToken((token) =>
            fetch(`${GRAPH_BASE}/me/drive/special/approot`, {headers: {authorization: `Bearer ${token}`}}))
        if (!response.ok) throw new Error(describeFailure(response.status))
    },

    isConnected() {
        return active !== null
    },

    async save(_target: StorageTarget, snapshot: LibrarySnapshot) {
        const response = await withAccessToken((token) =>
            fetch(contentUrl(), {
                method: 'PUT',
                headers: {authorization: `Bearer ${token}`, 'content-type': 'application/json'},
                body: serialiseSnapshot(snapshot),
            }))
        if (!response.ok) throw new Error(describeFailure(response.status))
    },

    async load(_target: StorageTarget) {
        const response = await withAccessToken((token) =>
            fetch(contentUrl(), {headers: {authorization: `Bearer ${token}`}}))
        if (response.status === 404) return null
        if (!response.ok) throw new Error(describeFailure(response.status))
        return parseSnapshot(await response.text())
    },

    async readRevision(_target: StorageTarget) {
        if (!active) return null
        const response = await withAccessToken((token) =>
            fetch(contentUrl(), {headers: {authorization: `Bearer ${token}`}}))
        // No file yet (e.g. right after a fresh connect); mirror the file-absent case as null rather than throwing.
        if (response.status === 404) return null
        if (!response.ok) throw new Error(describeFailure(response.status))
        // The in-file revision GUID (not Graph's eTag/cTag) is what save() mints and compares against.
        return parseSnapshot(await response.text()).revision
    },
}
