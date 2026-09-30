import {afterEach, describe, expect, it, vi} from 'vitest'
import type {LibrarySnapshot} from '@lib/storage/snapshot.ts'
import type {GoogleDriveConnection} from './googleDriveProvider.ts'
import {adoptConnection, googleDriveProvider} from './googleDriveProvider.ts'
import {serialiseSnapshot} from './fileProvider.ts'

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
    it('creates the file (multipart) when no id is stored and the name lookup finds nothing, persisting the id', async () => {
        const onChange = vi.fn()
        adoptConnection(connection, onChange)
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(refreshResponse())                              // token
            .mockResolvedValueOnce(listResponse([]))                               // name lookup: absent
            .mockResolvedValueOnce(new Response(JSON.stringify({id: 'new-file'}), {status: 200}))) // create
        await googleDriveProvider.save(target, snapshot)

        const [createUrl, createInit] = vi.mocked(fetch).mock.calls[2]
        expect(createUrl).toBe(`${UPLOAD_API}/files?uploadType=multipart&fields=id`)
        expect(createInit?.method).toBe('POST')
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({fileId: 'new-file'}))
    })

    it('updates (media PATCH) when an id is stored', async () => {
        adoptConnection({...connection, fileId: 'file-1'})
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(refreshResponse())
            .mockResolvedValueOnce(new Response(null, {status: 200})))
        await googleDriveProvider.save(target, snapshot)

        const [url, init] = vi.mocked(fetch).mock.calls[1]
        expect(url).toBe(`${UPLOAD_API}/files/file-1?uploadType=media`)
        expect(init?.method).toBe('PATCH')
        expect(init?.body).toBe(serialiseSnapshot(snapshot))
    })

    it('clears the stored id and recreates when the id-addressed PATCH 404s', async () => {
        const onChange = vi.fn()
        adoptConnection({...connection, fileId: 'stale'}, onChange)
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(refreshResponse())               // token
            .mockResolvedValueOnce(new Response(null, {status: 404})) // PATCH: gone
            .mockResolvedValueOnce(listResponse([]))                 // re-lookup: absent
            .mockResolvedValueOnce(new Response(JSON.stringify({id: 'file-2'}), {status: 200}))) // recreate
        await googleDriveProvider.save(target, snapshot)

        expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({fileId: 'file-2'}))
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

    it('reads the in-file revision, and returns null when the file is absent or disconnected', async () => {
        adoptConnection({...connection, fileId: 'file-1'})
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(refreshResponse())
            .mockResolvedValueOnce(new Response(serialiseSnapshot(snapshot), {status: 200})))
        expect(await googleDriveProvider.readRevision(target)).toBe('rev-42')

        adoptConnection(connection)
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(refreshResponse())
            .mockResolvedValueOnce(listResponse([])))
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
