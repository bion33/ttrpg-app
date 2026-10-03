import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import type {LibrarySnapshot} from '@lib/storage/snapshot.ts'
import type {NextcloudConnection} from './nextcloudProvider.ts'
import {adoptConnection, nextcloudProvider, webdavParentUrls, webdavUrl} from './nextcloudProvider.ts'
import {
    extractMetadata,
    metadataLocator,
    serialiseInvalidatedMetadata,
    serialiseMetadata,
    serialiseSnapshot,
} from '@lib/storage/snapshotCodec.ts'

const connection: NextcloudConnection = {
    baseUrl: 'https://cloud.example.com/',
    username: 'ada lovelace',
    appPassword: 'app-pass',
    path: 'personal/ttrpg-app.json',
    label: 'cloud.example.com > personal/ttrpg-app.json',
}

const snapshot: LibrarySnapshot = {
    version: 1,
    revision: 'rev-42',
    savedAt: '2026-01-01T00:00:00.000Z',
    entries: {binders: '[]'},
}

const target = {provider: 'nextcloud' as const, locator: webdavUrl(connection), label: connection.label}

// The headers of the first fetch call, for asserting what the relay was told to forward.
function firstCallHeaders(): Record<string, string> {
    return (vi.mocked(fetch).mock.calls[0][1]?.headers ?? {}) as Record<string, string>
}

beforeEach(() => {
    adoptConnection(connection)
})

afterEach(() => {
    adoptConnection(null)
    vi.restoreAllMocks()
})

describe('webdavUrl', () => {
    it('encodes the username and path segments and normalises slashes', () => {
        expect(webdavUrl(connection)).toBe(
            'https://cloud.example.com/remote.php/dav/files/ada%20lovelace/personal/ttrpg-app.json',
        )
    })
})

describe('webdavParentUrls', () => {
    it('lists ancestor collections in order for a nested path', () => {
        expect(webdavParentUrls(connection)).toEqual([
            'https://cloud.example.com/remote.php/dav/files/ada%20lovelace/personal',
        ])
    })

    it('is empty when the file sits at the WebDAV root', () => {
        expect(webdavParentUrls({...connection, path: 'library.json'})).toEqual([])
    })
})

describe('nextcloudProvider relay', () => {
    it('sends the target, method, and Basic auth header to the relay', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(serialiseSnapshot(snapshot), {status: 200})))
        await nextcloudProvider.load(target)
        const headers = firstCallHeaders()
        expect(vi.mocked(fetch).mock.calls[0][0]).toBe('/api/nextcloud')
        expect(headers['x-nc-url']).toBe(target.locator)
        expect(headers['x-nc-method']).toBe('GET')
        expect(headers.authorization).toBe(`Basic ${btoa('ada lovelace:app-pass')}`)
    })

    it('invalidates the sidecar, then PUTs the body, then PUTs the describing sidecar, in order', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status: 201})))
        await nextcloudProvider.save(target, snapshot)
        const calls = vi.mocked(fetch).mock.calls.map(([, init]) => {
            const headers = init?.headers as Record<string, string>
            return {method: headers['x-nc-method'], url: headers['x-nc-url'], body: init?.body}
        })
        expect(calls).toEqual([
            {method: 'PUT', url: metadataLocator(target.locator), body: serialiseInvalidatedMetadata()},
            {method: 'PUT', url: target.locator, body: serialiseSnapshot(snapshot)},
            {method: 'PUT', url: metadataLocator(target.locator), body: serialiseMetadata(extractMetadata(snapshot))},
        ])
    })

    it('returns null on a 404 load', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status: 404})))
        expect(await nextcloudProvider.load(target)).toBeNull()
    })

    it('returns the parsed snapshot on a 200 load', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(serialiseSnapshot(snapshot), {status: 200})))
        expect(await nextcloudProvider.load(target)).toEqual(snapshot)
    })

    it('reads the revision from the small sidecar without fetching the body', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(serialiseMetadata(extractMetadata(snapshot)), {status: 200}))
        vi.stubGlobal('fetch', fetchMock)
        expect(await nextcloudProvider.readRevision(target)).toBe('rev-42')
        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect((fetchMock.mock.calls[0][1]?.headers as Record<string, string>)['x-nc-url'])
            .toBe(metadataLocator(target.locator))
    })

    it('falls back to the body revision when the sidecar is absent', async () => {
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(new Response(null, {status: 404}))                       // sidecar missing
            .mockResolvedValueOnce(new Response(serialiseSnapshot(snapshot), {status: 200}))) // body
        expect(await nextcloudProvider.readRevision(target)).toBe('rev-42')
    })

    it('falls back to the body revision when the sidecar holds the invalidation marker', async () => {
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(new Response(serialiseInvalidatedMetadata(), {status: 200}))  // mid-save marker
            .mockResolvedValueOnce(new Response(serialiseSnapshot(snapshot), {status: 200})))     // body
        expect(await nextcloudProvider.readRevision(target)).toBe('rev-42')
    })

    it('returns null when neither sidecar nor body exists', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status: 404})))
        expect(await nextcloudProvider.readRevision(target)).toBeNull()
    })

    it('surfaces a readable error on 401', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status: 401})))
        await expect(nextcloudProvider.load(target)).rejects.toThrow(/credentials/)
    })

    it('walks parent collections with MKCOL, tolerating existing ones, on connect', async () => {
        const responses = [
            new Response(null, {status: 207}), // PROPFIND base
            new Response(null, {status: 405}), // MKCOL personal (already exists)
        ]
        vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(responses.shift())))
        await expect(nextcloudProvider.connect()).resolves.toBeUndefined()
        const methods = vi.mocked(fetch).mock.calls.map(([, init]) => (init?.headers as Record<string, string>)['x-nc-method'])
        expect(methods).toEqual(['PROPFIND', 'MKCOL'])
    })
})
