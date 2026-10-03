import {afterEach, describe, expect, it, vi} from 'vitest'
import type {LibrarySnapshot} from '@lib/storage/snapshot.ts'
import type {GoogleDriveConnection} from './googleDriveProvider.ts'
import {adoptConnection, googleDriveProvider} from './googleDriveProvider.ts'
import {
    extractMetadata,
    serialiseInvalidatedMetadata,
    serialiseMetadata,
    serialiseSnapshot,
} from '@lib/storage/snapshotCodec.ts'

const connection: GoogleDriveConnection = {refreshToken: 'refresh-0', label: 'Google Drive'}

const snapshot: LibrarySnapshot = {
    version: 1,
    revision: 'rev-42',
    savedAt: '2026-01-01T00:00:00.000Z',
    entries: {binders: '[]'},
}

const target = {provider: 'googleDrive' as const, locator: 'ttrpg-app.json', label: 'Google Drive'}

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'

// A JSON Response for a token-refresh reply; Google does not rotate the refresh token, so none is returned.
function refreshResponse(): Response {
    return new Response(JSON.stringify({access_token: 'access', expires_in: 3600}), {status: 200})
}

// A Drive list Response naming the found file ids (empty for "no such file").
function listResponse(ids: string[]): Response {
    return new Response(JSON.stringify({files: ids.map((id) => ({id}))}), {status: 200})
}

afterEach(() => {
    adoptConnection(null)
    vi.restoreAllMocks()
})

describe('googleDriveProvider', () => {
    it('creates both the sidecar and body files when none exist, persisting both ids', async () => {
        const onChange = vi.fn()
        adoptConnection(connection, onChange)
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(refreshResponse())                                             // token
            .mockResolvedValueOnce(listResponse([]))                                             // sidecar lookup: absent
            .mockResolvedValueOnce(new Response(JSON.stringify({id: 'meta-file'}), {status: 200})) // create sidecar (marker)
            .mockResolvedValueOnce(listResponse([]))                                             // body lookup: absent
            .mockResolvedValueOnce(new Response(JSON.stringify({id: 'new-file'}), {status: 200}))  // create body
            .mockResolvedValueOnce(new Response(null, {status: 200})))                             // PATCH sidecar (real)
        await googleDriveProvider.save(target, snapshot)

        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({metadataFileId: 'meta-file'}))
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({fileId: 'new-file'}))
    })

    it('invalidates the sidecar, then overwrites body, then writes the describing sidecar, in order', async () => {
        adoptConnection({...connection, fileId: 'file-1', metadataFileId: 'meta-1'})
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(refreshResponse())
            .mockResolvedValueOnce(new Response(null, {status: 200}))  // PATCH sidecar (marker)
            .mockResolvedValueOnce(new Response(null, {status: 200}))  // PATCH body
            .mockResolvedValueOnce(new Response(null, {status: 200}))) // PATCH sidecar (real)
        await googleDriveProvider.save(target, snapshot)

        const bodies = vi.mocked(fetch).mock.calls.slice(1).map(([url, init]) => ({url, body: init?.body}))
        expect(bodies).toEqual([
            {url: `${UPLOAD_API}/files/meta-1?uploadType=media`, body: serialiseInvalidatedMetadata()},
            {url: `${UPLOAD_API}/files/file-1?uploadType=media`, body: serialiseSnapshot(snapshot)},
            {url: `${UPLOAD_API}/files/meta-1?uploadType=media`, body: serialiseMetadata(extractMetadata(snapshot))},
        ])
    })

    it('clears the stored body id and recreates when the body PATCH 404s', async () => {
        const onChange = vi.fn()
        adoptConnection({...connection, fileId: 'stale', metadataFileId: 'meta-1'}, onChange)
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(refreshResponse())                                          // token
            .mockResolvedValueOnce(new Response(null, {status: 200}))                           // PATCH sidecar (marker)
            .mockResolvedValueOnce(new Response(null, {status: 404}))                           // PATCH body: gone
            .mockResolvedValueOnce(listResponse([]))                                           // body re-lookup: absent
            .mockResolvedValueOnce(new Response(JSON.stringify({id: 'file-2'}), {status: 200})) // recreate body
            .mockResolvedValueOnce(new Response(null, {status: 200})))                          // PATCH sidecar (real)
        await googleDriveProvider.save(target, snapshot)

        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({fileId: 'file-2'}))
    })

    it('returns null on load when no file exists', async () => {
        adoptConnection(connection)
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(refreshResponse())
            .mockResolvedValueOnce(listResponse([])))
        expect(await googleDriveProvider.load(target)).toBeNull()
    })

    it('addresses the file directly on load when an id is stored (no name query)', async () => {
        adoptConnection({...connection, fileId: 'file-1'})
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(refreshResponse())
            .mockResolvedValueOnce(new Response(serialiseSnapshot(snapshot), {status: 200})))
        expect(await googleDriveProvider.load(target)).toEqual(snapshot)

        const [url] = vi.mocked(fetch).mock.calls[1]
        expect(url).toBe(`${DRIVE_API}/files/file-1?alt=media`)
        expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)
    })

    it('reads the revision from the stored sidecar id without fetching the body', async () => {
        adoptConnection({...connection, fileId: 'file-1', metadataFileId: 'meta-1'})
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(refreshResponse())
            .mockResolvedValueOnce(new Response(serialiseMetadata(extractMetadata(snapshot)), {status: 200})))
        expect(await googleDriveProvider.readRevision(target)).toBe('rev-42')
        expect(vi.mocked(fetch).mock.calls[1][0]).toBe(`${DRIVE_API}/files/meta-1?alt=media`)
        expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)
    })

    it('falls back to the body revision when no sidecar file exists', async () => {
        adoptConnection({...connection, fileId: 'file-1'})
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(refreshResponse())
            .mockResolvedValueOnce(listResponse([]))                                         // sidecar lookup: absent
            .mockResolvedValueOnce(new Response(serialiseSnapshot(snapshot), {status: 200}))) // body by stored id
        expect(await googleDriveProvider.readRevision(target)).toBe('rev-42')
    })

    it('falls back to the body revision when the sidecar holds the invalidation marker', async () => {
        adoptConnection({...connection, fileId: 'file-1', metadataFileId: 'meta-1'})
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(refreshResponse())
            .mockResolvedValueOnce(new Response(serialiseInvalidatedMetadata(), {status: 200})) // mid-save marker
            .mockResolvedValueOnce(new Response(serialiseSnapshot(snapshot), {status: 200})))    // body by stored id
        expect(await googleDriveProvider.readRevision(target)).toBe('rev-42')
    })

    it('returns null when neither sidecar nor body exists, and when disconnected', async () => {
        adoptConnection(connection)
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(refreshResponse())
            .mockResolvedValueOnce(listResponse([]))  // sidecar lookup: absent
            .mockResolvedValueOnce(listResponse([]))) // body lookup: absent
        expect(await googleDriveProvider.readRevision(target)).toBeNull()

        adoptConnection(null)
        expect(await googleDriveProvider.readRevision(target)).toBeNull()
    })

    it('refreshes once and retries on a 401 from Drive', async () => {
        adoptConnection({...connection, fileId: 'file-1'})
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(refreshResponse())                                 // initial token
            .mockResolvedValueOnce(new Response(null, {status: 401}))                  // Drive rejects
            .mockResolvedValueOnce(refreshResponse())                                 // forced refresh
            .mockResolvedValueOnce(new Response(serialiseSnapshot(snapshot), {status: 200}))) // retry succeeds
        expect(await googleDriveProvider.load(target)).toEqual(snapshot)
        expect(vi.mocked(fetch)).toHaveBeenCalledTimes(4)
    })

    it('throws a readable error on a hard failure', async () => {
        adoptConnection({...connection, fileId: 'file-1'})
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(refreshResponse())
            .mockResolvedValueOnce(new Response(null, {status: 500})))
        await expect(googleDriveProvider.load(target)).rejects.toThrow(/Google Drive request failed/)
    })
})
