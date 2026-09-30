import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import type {LibrarySnapshot} from '@lib/storage/snapshot.ts'
import type {NextcloudConnection} from './nextcloudProvider.ts'
import {adoptConnection, nextcloudProvider, webdavParentUrls, webdavUrl} from './nextcloudProvider.ts'
import {serialiseSnapshot} from './fileProvider.ts'

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

    it('PUTs the serialised snapshot on save', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status: 201})))
        await nextcloudProvider.save(target, snapshot)
        const [, init] = vi.mocked(fetch).mock.calls[0]
        expect((init?.headers as Record<string, string>)['x-nc-method']).toBe('PUT')
        expect(init?.body).toBe(serialiseSnapshot(snapshot))
    })

    it('returns null on a 404 load', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status: 404})))
        expect(await nextcloudProvider.load(target)).toBeNull()
    })

    it('returns the parsed snapshot on a 200 load', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(serialiseSnapshot(snapshot), {status: 200})))
        expect(await nextcloudProvider.load(target)).toEqual(snapshot)
    })

    it('reads the in-file revision, and null on 404', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(serialiseSnapshot(snapshot), {status: 200})))
        expect(await nextcloudProvider.readRevision(target)).toBe('rev-42')
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
