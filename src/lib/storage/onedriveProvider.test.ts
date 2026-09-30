import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import type {LibrarySnapshot} from '../snapshot.ts'
import {adoptConnection, contentUrl, onedriveProvider} from './onedriveProvider.ts'
import type {OneDriveConnection} from './onedriveProvider.ts'
import {serialiseSnapshot} from './fileProvider.ts'

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

    it('reads the in-file revision, and maps 404 to null', async () => {
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(refreshResponse())
            .mockResolvedValueOnce(new Response(serialiseSnapshot(snapshot), {status: 200})))
        expect(await onedriveProvider.readRevision(target)).toBe('rev-42')

        adoptConnection(connection)
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(refreshResponse())
            .mockResolvedValueOnce(new Response(null, {status: 404})))
        expect(await onedriveProvider.readRevision(target)).toBeNull()
    })

    it('PUTs the serialised snapshot on save', async () => {
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(refreshResponse())
            .mockResolvedValueOnce(new Response(null, {status: 200})))
        await onedriveProvider.save(target, snapshot)
        const [url, init] = vi.mocked(fetch).mock.calls[1]
        expect(url).toBe(contentUrl(target.locator))
        expect(init?.method).toBe('PUT')
        expect(init?.body).toBe(serialiseSnapshot(snapshot))
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
