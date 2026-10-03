import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {nextcloud} from './nextcloud.ts'

const originalEnv = {...process.env}

// Sends one relayed request through the sub-app with the given headers and body.
function request(headers: Record<string, string>, body?: string) {
    return nextcloud.request('/', {method: 'POST', headers, body})
}

const AUTH = {'x-nc-url': 'http://cloud.example.com/file.json', authorization: 'Basic dXNlcjpwdw=='}

beforeEach(() => {
    delete process.env.NODE_ENV
    delete process.env.NEXTCLOUD_ALLOWED_HOSTS
})

afterEach(() => {
    process.env = {...originalEnv}
    vi.restoreAllMocks()
})

describe('nextcloud relay', () => {
    it('rejects a missing target or credentials with 400', async () => {
        expect((await request({authorization: 'Basic x'})).status).toBe(400)
        expect((await request({'x-nc-url': 'http://cloud.example.com/x'})).status).toBe(400)
    })

    it('rejects a disallowed method with 405', async () => {
        expect((await request({...AUTH, 'x-nc-method': 'PATCH'})).status).toBe(405)
    })

    it('returns 503 when the relay is unconfigured in production', async () => {
        process.env.NODE_ENV = 'production'
        expect((await request(AUTH)).status).toBe(503)
    })

    it('returns 400 for a host not on the allowlist', async () => {
        process.env.NODE_ENV = 'production'
        process.env.NEXTCLOUD_ALLOWED_HOSTS = 'other.example.com'
        expect((await request({...AUTH, 'x-nc-url': 'https://cloud.example.com/x'})).status).toBe(400)
    })

    it('does not follow a 3xx upstream redirect', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, {status: 302}))
        const response = await request(AUTH)
        expect(response.status).toBe(502)
    })

    it('forwards method, headers, and body and returns the upstream status and body', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response('upstream-body', {status: 201, headers: {'content-type': 'text/plain'}}),
        )
        const response = await request({...AUTH, 'x-nc-method': 'PUT'}, 'payload')

        expect(response.status).toBe(201)
        expect(await response.text()).toBe('upstream-body')
        const [url, init] = fetchMock.mock.calls[0]
        expect((url as URL).href).toBe('http://cloud.example.com/file.json')
        expect(init?.method).toBe('PUT')
        expect((init?.headers as Record<string, string>).authorization).toBe('Basic dXNlcjpwdw==')
        expect(init?.redirect).toBe('manual')
    })
})
