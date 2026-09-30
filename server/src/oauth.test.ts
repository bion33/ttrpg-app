import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {oauth} from './oauth.ts'

const originalEnv = {...process.env}

// Sends one JSON request through the sub-app.
function request(path: string, body: unknown) {
  return oauth.request(path, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  process.env.MS_TENANT = 'common'
  process.env.MS_CLIENT_ID = 'client-id'
  process.env.MS_CLIENT_SECRET = 'client-secret'
  process.env.MS_REDIRECT_URI = 'http://localhost:8080/oauth/microsoft/callback.html'
})

afterEach(() => {
  process.env = {...originalEnv}
  vi.restoreAllMocks()
})

describe('oauth relay', () => {
  it('returns 404 for an unknown provider', async () => {
    expect((await request('/twitter/exchange', {code: 'c', codeVerifier: 'v'})).status).toBe(404)
  })

  it('returns 400 when code or codeVerifier is missing on exchange', async () => {
    expect((await request('/microsoft/exchange', {codeVerifier: 'v'})).status).toBe(400)
    expect((await request('/microsoft/exchange', {code: 'c'})).status).toBe(400)
  })

  it('returns 400 when refreshToken is missing on refresh', async () => {
    expect((await request('/microsoft/refresh', {})).status).toBe(400)
  })

  it('forwards the authorization_code grant and returns only the token fields', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        access_token: 'at', refresh_token: 'rt', expires_in: 3600, extra: 'ignored',
      }), {status: 200}),
    )
    const response = await request('/microsoft/exchange', {code: 'the-code', codeVerifier: 'the-verifier'})

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({access_token: 'at', refresh_token: 'rt', expires_in: 3600})
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://login.microsoftonline.com/common/oauth2/v2.0/token')
    const params = new URLSearchParams(init?.body as string)
    expect(params.get('grant_type')).toBe('authorization_code')
    expect(params.get('code')).toBe('the-code')
    expect(params.get('code_verifier')).toBe('the-verifier')
    expect(params.get('client_id')).toBe('client-id')
    expect(params.get('client_secret')).toBe('client-secret')
    expect(params.get('redirect_uri')).toBe('http://localhost:8080/oauth/microsoft/callback.html')
  })

  it('forwards the refresh_token grant', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({access_token: 'at2', refresh_token: 'rt2', expires_in: 3600}), {status: 200}),
    )
    const response = await request('/microsoft/refresh', {refreshToken: 'old-refresh'})

    expect(response.status).toBe(200)
    const params = new URLSearchParams(fetchMock.mock.calls[0][1]?.body as string)
    expect(params.get('grant_type')).toBe('refresh_token')
    expect(params.get('refresh_token')).toBe('old-refresh')
  })

  it('maps an upstream failure to 400 with the error surfaced', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('invalid_grant', {status: 400}),
    )
    const response = await request('/microsoft/exchange', {code: 'c', codeVerifier: 'v'})
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({error: 'token_request_failed', detail: 'invalid_grant'})
  })
})
