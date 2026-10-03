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
 * A Google Drive connection: a long-lived refresh token (persisted device-locally in IndexedDB), a generic display
 * label, and — once resolved on the first save/load — the id of the app-data file, so later ops address it directly.
 * The short-lived access token is never persisted; it is fetched on demand and held in memory.
 */
export interface GoogleDriveConnection {
    refreshToken: string
    label: string
    fileId?: string
    metadataFileId?: string
}

// Which connection field caches a resolved app-data file id: the snapshot body's file, or its metadata sidecar's.
type FileIdSlot = 'fileId' | 'metadataFileId'

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

// Persists a newly resolved/created id into the given slot on the active connection so later ops address it directly.
function rememberFileId(slot: FileIdSlot, fileId: string): void {
    const active = tokenClient.getConnection()
    if (!active) return
    tokenClient.setConnection({...active, [slot]: fileId})
}

// Creates the app-data file (metadata + JSON media in one multipart POST), returning its new id; the first save writes
// the initial content this way. `fields=id` is required so the response carries the id to store.
async function createFile(fileName: string, slot: FileIdSlot, content: string): Promise<string> {
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
        content,
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
    const {id} = await response.json() as { id: string }
    rememberFileId(slot, id)
    return id
}

// Queries the app-data folder once for the file id by name, returning it (persisted into the slot) or null when absent.
async function lookupFileId(fileName: string, slot: FileIdSlot): Promise<string | null> {
    const query = new URLSearchParams({
        spaces: 'appDataFolder',
        q: `name='${fileName}'`,
        fields: 'files(id)',
        pageSize: '1',
    })
    const response = await withAccessToken((token) =>
        fetch(`${DRIVE_API}/files?${query.toString()}`, {headers: {authorization: `Bearer ${token}`}}))
    if (!response.ok) throw new Error(await describeHttpFailure(response, describeFailure))
    const {files} = await response.json() as { files: { id: string }[] }
    const found = files[0]?.id ?? null
    if (found) rememberFileId(slot, found)
    return found
}

// The outcome of resolving the file id: the id (null when absent and not created) and whether a create just wrote it.
interface FileIdResult {
    fileId: string | null
    created: boolean
}

// Resolves an app-data file id at most once: the slot's stored id (no request) else a single name lookup, creating the
// file with `content` when it does not exist and `create` is set. `created` is true only when this call wrote the file.
async function ensureFileId(
    fileName: string,
    slot: FileIdSlot,
    options: { create: false } | { create: true; content: string },
): Promise<FileIdResult> {
    const storedId = tokenClient.getConnection()?.[slot]
    if (storedId) return {fileId: storedId, created: false}
    const existing = await lookupFileId(fileName, slot)
    if (existing) return {fileId: existing, created: false}
    if (!options.create) return {fileId: null, created: false}
    return {fileId: await createFile(fileName, slot, options.content), created: true}
}

// Forgets a slot's stored file id (e.g. after an external delete) so the next resolve re-looks-up or recreates it.
function forgetFileId(slot: FileIdSlot): void {
    const active = tokenClient.getConnection()
    if (active) tokenClient.setConnection({...active, [slot]: undefined})
}

// Writes `content` to an existing app-data file by id (overwriting its media); 404 means the id is stale (externally
// deleted), reported so the caller can forget it and recreate.
async function patchMedia(fileId: string, content: string): Promise<{ ok: true } | { ok: false; gone: boolean }> {
    const response = await withAccessToken((token) =>
        fetch(`${UPLOAD_API}/files/${fileId}?uploadType=media`, {
            method: 'PATCH',
            headers: {authorization: `Bearer ${token}`, 'content-type': 'application/json'},
            body: content,
        }))
    if (response.status === 404) return {ok: false, gone: true}
    if (!response.ok) throw new Error(await describeHttpFailure(response, describeFailure))
    return {ok: true}
}

// Ensures an app-data file holds exactly `content`: creates it when absent, else overwrites its media, recreating once
// if the stored id was externally deleted.
async function writeFile(fileName: string, slot: FileIdSlot, content: string): Promise<void> {
    const {fileId, created} = await ensureFileId(fileName, slot, {create: true, content})
    // A freshly created file already holds `content` (multipart write); create:true always yields a non-null id.
    if (created || fileId === null) return
    const written = await patchMedia(fileId, content)
    if (written.ok) return
    forgetFileId(slot)
    await ensureFileId(fileName, slot, {create: true, content})
}

// Reads an app-data file's media text, or null when it does not exist; a stored id that 404s is forgotten so the next
// resolve re-looks-up or recreates it.
async function readMedia(fileName: string, slot: FileIdSlot): Promise<string | null> {
    const {fileId} = await ensureFileId(fileName, slot, {create: false})
    if (!fileId) return null
    const response = await withAccessToken((token) =>
        fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {headers: {authorization: `Bearer ${token}`}}))
    if (response.status === 404) {
        forgetFileId(slot)
        return null
    }
    if (!response.ok) throw new Error(await describeHttpFailure(response, describeFailure))
    return response.text()
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
        // Invalidate the sidecar first, so a later-failing write never leaves it describing a stale revision; a probe
        // then falls back to the body. Then the body, then the sidecar describing it. The sidecar file is reused by id
        // (overwritten, never deleted) so its id does not churn each save.
        await writeFile(metadataLocator(target.locator), 'metadataFileId', serialiseInvalidatedMetadata())
        await writeFile(target.locator, 'fileId', serialiseSnapshot(snapshot))
        await writeFile(metadataLocator(target.locator), 'metadataFileId', serialiseMetadata(extractMetadata(snapshot)))
    },

    async load(target: StorageTarget) {
        const text = await readMedia(target.locator, 'fileId')
        return text === null ? null : parseSnapshot(text)
    },

    async readRevision(target: StorageTarget) {
        if (!tokenClient.getConnection()) return null
        // The in-file revision GUID (not Drive's version/headRevisionId) is what save() mints and compares against.
        return readRevisionWithFallback(
            (locator) => readMedia(locator, locator === target.locator ? 'fileId' : 'metadataFileId'),
            target.locator,
        )
    },
}
