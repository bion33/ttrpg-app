import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import type {LibrarySnapshot} from '@lib/storage/snapshot.ts'
import type {OneDriveConnection} from './onedriveProvider.ts'
import {adoptConnection, contentUrl, onedriveProvider} from './onedriveProvider.ts'
import {
    extractMetadata,
    metadataLocator,
    serialiseInvalidatedMetadata,
    serialiseMetadata,
    serialiseSnapshot,
} from '@lib/storage/snapshotCodec.ts'

const connection: OneDriveConnection = {refreshToken: 'refresh-0', label: 'OneDrive'}

const snapshot: LibrarySnapshot = {
    version: 1,
    revision: 'rev-42',
    savedAt: '2026-01-01T00:00:00.000Z',
    entries: {binders: '[]'},
}

const target = {provider: 'onedrive' as const, locator: 'ttrpg-app.json', label: 'OneDrive'}

// A JSON Response for a token-refresh reply.
function refreshResponse(refreshToken = 'refresh-0'): Response {
    return new Response(JSON.stringify({access_token: 'access', refresh_token: refreshToken, expires_in: 3600}),
        {status: 200})
}

beforeEach(() => {
    adoptConnection(connection)
})

afterEach(() => {
    adoptConnection(null)
    vi.restoreAllMocks()
})

describe('contentUrl', () => {
    it('builds the exact Graph app-folder content URL for the named file', () => {
        expect(contentUrl('ttrpg-app.json'))
            .toBe('https://graph.microsoft.com/v1.0/me/drive/special/approot:/ttrpg-app.json:/content')
    })
})

describe('onedriveProvider', () => {
    it('refreshes then GETs on load, parsing the body', async () => {
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(refreshResponse())
            .mockResolvedValueOnce(new Response(serialiseSnapshot(snapshot), {status: 200})))
        expect(await onedriveProvider.load(target)).toEqual(snapshot)
        const [refreshUrl] = vi.mocked(fetch).mock.calls[0]
        expect(refreshUrl).toBe('/api/oauth/microsoft/refresh')
        const [contentGetUrl, init] = vi.mocked(fetch).mock.calls[1]
        expect(contentGetUrl).toBe(contentUrl(target.locator))
        expect((init?.headers as Record<string, string>).authorization).toBe('Bearer access')
    })

    it('maps a 404 load to null', async () => {
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(refreshResponse())
            .mockResolvedValueOnce(new Response(null, {status: 404})))
        expect(await onedriveProvider.load(target)).toBeNull()
    })

    it('reads the revision from the small sidecar without fetching the body', async () => {
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(refreshResponse())
            .mockResolvedValueOnce(new Response(serialiseMetadata(extractMetadata(snapshot)), {status: 200})))
        expect(await onedriveProvider.readRevision(target)).toBe('rev-42')
        expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)
        expect(vi.mocked(fetch).mock.calls[1][0]).toBe(contentUrl(metadataLocator(target.locator)))
    })

    it('falls back to the body revision when the sidecar is absent', async () => {
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(refreshResponse())
            .mockResolvedValueOnce(new Response(null, {status: 404}))                        // sidecar missing
            .mockResolvedValueOnce(new Response(serialiseSnapshot(snapshot), {status: 200}))) // body
        expect(await onedriveProvider.readRevision(target)).toBe('rev-42')
    })

    it('falls back to the body revision when the sidecar holds the invalidation marker', async () => {
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(refreshResponse())
            .mockResolvedValueOnce(new Response(serialiseInvalidatedMetadata(), {status: 200}))  // mid-save marker
            .mockResolvedValueOnce(new Response(serialiseSnapshot(snapshot), {status: 200})))     // body
        expect(await onedriveProvider.readRevision(target)).toBe('rev-42')
    })

    it('returns null when neither sidecar nor body exists', async () => {
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(refreshResponse())
            .mockResolvedValueOnce(new Response(null, {status: 404}))
            .mockResolvedValueOnce(new Response(null, {status: 404})))
        expect(await onedriveProvider.readRevision(target)).toBeNull()
    })

    it('invalidates the sidecar, then PUTs the body, then PUTs the describing sidecar, in order', async () => {
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(refreshResponse())
            .mockResolvedValueOnce(new Response(null, {status: 200}))  // PUT invalidated sidecar
            .mockResolvedValueOnce(new Response(null, {status: 200}))  // PUT body
            .mockResolvedValueOnce(new Response(null, {status: 200}))) // PUT describing sidecar
        await onedriveProvider.save(target, snapshot)
        const calls = vi.mocked(fetch).mock.calls.slice(1).map(([url, init]) =>
            ({url, method: init?.method, body: init?.body}))
        expect(calls).toEqual([
            {url: contentUrl(metadataLocator(target.locator)), method: 'PUT', body: serialiseInvalidatedMetadata()},
            {url: contentUrl(target.locator), method: 'PUT', body: serialiseSnapshot(snapshot)},
            {
                url: contentUrl(metadataLocator(target.locator)),
                method: 'PUT',
                body: serialiseMetadata(extractMetadata(snapshot)),
            },
        ])
    })

    it('refreshes once and retries on a 401 from Graph', async () => {
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(refreshResponse())                                 // initial token
            .mockResolvedValueOnce(new Response(null, {status: 401}))                  // Graph rejects
            .mockResolvedValueOnce(refreshResponse())                                 // forced refresh
            .mockResolvedValueOnce(new Response(serialiseSnapshot(snapshot), {status: 200}))) // retry succeeds
        expect(await onedriveProvider.load(target)).toEqual(snapshot)
        expect(vi.mocked(fetch)).toHaveBeenCalledTimes(4)
    })

    it('fires the change callback with the rotated refresh token', async () => {
        const onChange = vi.fn()
        adoptConnection(connection, onChange)
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(refreshResponse('refresh-1'))
            .mockResolvedValueOnce(new Response(serialiseSnapshot(snapshot), {status: 200})))
        await onedriveProvider.load(target)
        expect(onChange).toHaveBeenCalledWith({refreshToken: 'refresh-1', label: 'OneDrive'})
    })

    it('throws a readable error on a hard failure', async () => {
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(refreshResponse())
            .mockResolvedValueOnce(new Response(null, {status: 500})))
        await expect(onedriveProvider.load(target)).rejects.toThrow(/OneDrive request failed/)
    })
})
