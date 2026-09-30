import type {LibrarySnapshot} from '../snapshot.ts'
import type {StorageProvider, StorageTarget} from './StorageProvider.ts'
import {parseSnapshot, serialiseSnapshot} from './fileProvider.ts'
import {createOAuthTokenClient} from './oauthTokenClient.ts'
import {describeHttpFailure} from './httpError.ts'

/**
 * A Google Drive connection: a long-lived refresh token (persisted device-locally in IndexedDB), a generic display
 * label, and — once resolved on the first save/load — the id of the app-data file, so later ops address it directly.
 * The short-lived access token is never persisted; it is fetched on demand and held in memory.
 */
export interface GoogleDriveConnection {
    refreshToken: string
    label: string
    fileId?: string
}

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'

// The shared connection/access-token machinery, bound to Google's relay refresh endpoint and messages.
const tokenClient = createOAuthTokenClient<GoogleDriveConnection>({
    refreshEndpoint: '/api/oauth/google/refresh',
    notConnectedMessage: 'Not connected to Google Drive.',
    expiredMessage: 'Google Drive sign-in has expired. Reconnect in storage settings.',
})
const {withAccessToken} = tokenClient

/**
 * Sets the in-memory Google Drive connection (or clears it with null) and the optional change callback used to persist a
 * rotated refresh token or a resolved file id; persistence itself is owned by the caller. Drops any cached access token.
 */
export const adoptConnection = tokenClient.adopt

// A readable error message for a failed Drive response.
function describeFailure(status: number): string {
    if (status === 401 || status === 403) return 'Google Drive rejected the request. Reconnect in storage settings.'
    return `Google Drive request failed (${status}).`
}

// Persists a newly resolved/created id onto the active connection so later ops address the file directly.
function rememberFileId(fileId: string): void {
    const active = tokenClient.getConnection()
    if (!active) return
    tokenClient.setConnection({...active, fileId})
}

// Creates the app-data file (metadata + JSON media in one multipart POST), returning its new id; the first save writes
// the initial revision this way. `fields=id` is required so the response carries the id to store.
async function createFile(fileName: string, snapshot: LibrarySnapshot): Promise<string> {
    const boundary = 'ttrpg-boundary'
    const metadata = {name: fileName, parents: ['appDataFolder']}
    const body = [
        `--${boundary}`,
        'Content-Type: application/json; charset=UTF-8',
        '',
        JSON.stringify(metadata),
        `--${boundary}`,
        'Content-Type: application/json',
        '',
        serialiseSnapshot(snapshot),
        `--${boundary}--`,
        '',
    ].join('\r\n')
    const response = await withAccessToken((token) =>
        fetch(`${UPLOAD_API}/files?uploadType=multipart&fields=id`, {
            method: 'POST',
            headers: {authorization: `Bearer ${token}`, 'content-type': `multipart/related; boundary=${boundary}`},
            body,
        }))
    if (!response.ok) throw new Error(await describeHttpFailure(response, describeFailure))
    const {id} = await response.json() as {id: string}
    rememberFileId(id)
    return id
}

// Queries the app-data folder once for the file id by name, returning it (persisted) or null when absent.
async function lookupFileId(fileName: string): Promise<string | null> {
    const query = new URLSearchParams({
        spaces: 'appDataFolder',
        q: `name='${fileName}'`,
        fields: 'files(id)',
        pageSize: '1',
    })
    const response = await withAccessToken((token) =>
        fetch(`${DRIVE_API}/files?${query.toString()}`, {headers: {authorization: `Bearer ${token}`}}))
    if (!response.ok) throw new Error(await describeHttpFailure(response, describeFailure))
    const {files} = await response.json() as {files: {id: string}[]}
    const found = files[0]?.id ?? null
    if (found) rememberFileId(found)
    return found
}

// The outcome of resolving the file id: the id (null when absent and not created) and whether a create just wrote it.
interface FileIdResult {
    fileId: string | null
    created: boolean
}

// Resolves the app-data file id at most once: the stored id (no request) else a single name lookup, creating the file
// with `snapshot` when it does not exist and `create` is set. `created` is true only when this call wrote a new file.
async function ensureFileId(
    fileName: string,
    options: {create: false} | {create: true; snapshot: LibrarySnapshot},
): Promise<FileIdResult> {
    const storedId = tokenClient.getConnection()?.fileId
    if (storedId) return {fileId: storedId, created: false}
    const existing = await lookupFileId(fileName)
    if (existing) return {fileId: existing, created: false}
    if (!options.create) return {fileId: null, created: false}
    return {fileId: await createFile(fileName, options.snapshot), created: true}
}

// Forgets the stored file id (e.g. after an external delete) so the next resolve re-looks-up or recreates it.
function forgetFileId(): void {
    const active = tokenClient.getConnection()
    if (active) tokenClient.setConnection({...active, fileId: undefined})
}

/**
 * The Google Drive storage provider: saves, loads, and probes the whole-library JSON in the app's own hidden Drive
 * app-data folder via the Drive v3 REST API, refreshing the access token as needed. The file is addressed by id (stored
 * in the connection after a one-time name lookup), and the filename is owned by the target's locator.
 */
export const googleDriveProvider: StorageProvider = {
    id: 'googleDrive',

    async connect() {
        if (!tokenClient.getConnection()) throw new Error('No Google Drive connection to validate.')
        // One authenticated list of the app-data space both validates the token and confirms app-data access.
        const response = await withAccessToken((token) =>
            fetch(`${DRIVE_API}/files?spaces=appDataFolder&pageSize=1`, {headers: {authorization: `Bearer ${token}`}}))
        if (!response.ok) throw new Error(await describeHttpFailure(response, describeFailure))
    },

    isConnected() {
        return tokenClient.getConnection() !== null
    },

    async save(target: StorageTarget, snapshot: LibrarySnapshot) {
        const resolved = await ensureFileId(target.locator, {create: true, snapshot})
        // A freshly created file already holds this snapshot (multipart write), so no update PATCH is needed.
        if (resolved.created) return
        const response = await withAccessToken((token) =>
            fetch(`${UPLOAD_API}/files/${resolved.fileId}?uploadType=media`, {
                method: 'PATCH',
                headers: {authorization: `Bearer ${token}`, 'content-type': 'application/json'},
                body: serialiseSnapshot(snapshot),
            }))
        // The stored id was deleted externally: forget it and recreate the file once.
        if (response.status === 404) {
            forgetFileId()
            await ensureFileId(target.locator, {create: true, snapshot})
            return
        }
        if (!response.ok) throw new Error(await describeHttpFailure(response, describeFailure))
    },

    async load(target: StorageTarget) {
        const {fileId} = await ensureFileId(target.locator, {create: false})
        if (!fileId) return null
        const response = await withAccessToken((token) =>
            fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {headers: {authorization: `Bearer ${token}`}}))
        if (response.status === 404) return null
        if (!response.ok) throw new Error(await describeHttpFailure(response, describeFailure))
        return parseSnapshot(await response.text())
    },

    async readRevision(target: StorageTarget) {
        if (!tokenClient.getConnection()) return null
        const {fileId} = await ensureFileId(target.locator, {create: false})
        if (!fileId) return null
        const response = await withAccessToken((token) =>
            fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {headers: {authorization: `Bearer ${token}`}}))
        if (response.status === 404) return null
        if (!response.ok) throw new Error(await describeHttpFailure(response, describeFailure))
        // The in-file revision GUID (not Drive's version/headRevisionId) is what save() mints and compares against.
        return parseSnapshot(await response.text()).revision
    },
}
