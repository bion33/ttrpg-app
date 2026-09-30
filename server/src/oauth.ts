/**
 * Confidential-client OAuth relay: exchanges an authorization code (or a refresh token) for access tokens at a
 * provider's fixed token endpoint, keeping the client secret server-side. Generic over provider (`microsoft` now,
 * `google` ready for phase 5); the token endpoints are fixed constants, so no SSRF guard is needed.
 */
import {Hono} from 'hono'
import {env} from './env.ts'

/** The token-endpoint configuration for one OAuth provider, resolved lazily from environment variables. */
interface ProviderConfig {
  tokenEndpoint: string
  clientId: string
  clientSecret: string
  redirectUri: string
}

// The token fields forwarded back to the browser; the refresh token and secret exchange never reach the client secret.
interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
}

/**
 * Resolves the token-endpoint configuration for a provider, reading its environment variables lazily so one provider
 * works with another's variables unset; throws for an unknown provider (the route maps that to 404).
 */
export function configFor(provider: string): ProviderConfig {
  if (provider === 'microsoft') {
    const tenant = env('MS_TENANT', 'common')
    return {
      tokenEndpoint: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      clientId: env('MS_CLIENT_ID'),
      clientSecret: env('MS_CLIENT_SECRET'),
      redirectUri: env('MS_REDIRECT_URI'),
    }
  }
  if (provider === 'google') {
    return {
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      clientId: env('GOOGLE_CLIENT_ID'),
      clientSecret: env('GOOGLE_CLIENT_SECRET'),
      redirectUri: env('GOOGLE_REDIRECT_URI'),
    }
  }
  throw new UnknownProviderError(provider)
}

/** Raised for a provider with no known token endpoint; the route maps it to a 404. */
class UnknownProviderError extends Error {
  constructor(provider: string) {
    super(`Unknown OAuth provider: ${provider}`)
    this.name = 'UnknownProviderError'
  }
}

// POSTs form-encoded grant parameters to the token endpoint, returning the token fields or a 400-mapped upstream error.
async function forwardTokenRequest(config: ProviderConfig, params: URLSearchParams): Promise<
  {ok: true; tokens: TokenResponse} | {ok: false; error: string; detail: string}
> {
  params.set('client_id', config.clientId)
  params.set('client_secret', config.clientSecret)
  const upstream = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: {'content-type': 'application/x-www-form-urlencoded'},
    body: params.toString(),
  })
  const text = await upstream.text()
  if (!upstream.ok) return {ok: false, error: 'token_request_failed', detail: text}
  const parsed = JSON.parse(text) as TokenResponse
  return {ok: true, tokens: {
    access_token: parsed.access_token,
    refresh_token: parsed.refresh_token,
    expires_in: parsed.expires_in,
  }}
}

export const oauth = new Hono()

oauth.post('/:provider/exchange', async (context) => {
  let config: ProviderConfig
  try {
    config = configFor(context.req.param('provider'))
  } catch {
    return context.text('Unknown provider', 404)
  }
  const {code, codeVerifier} = await context.req.json<{code?: string; codeVerifier?: string}>()
  if (!code || !codeVerifier) return context.text('Missing code or codeVerifier', 400)

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    code_verifier: codeVerifier,
    redirect_uri: config.redirectUri,
  })
  const result = await forwardTokenRequest(config, params)
  if (!result.ok) return context.json({error: result.error, detail: result.detail}, 400)
  return context.json(result.tokens)
})

oauth.post('/:provider/refresh', async (context) => {
  let config: ProviderConfig
  try {
    config = configFor(context.req.param('provider'))
  } catch {
    return context.text('Unknown provider', 404)
  }
  const {refreshToken} = await context.req.json<{refreshToken?: string}>()
  if (!refreshToken) return context.text('Missing refreshToken', 400)

  const params = new URLSearchParams({grant_type: 'refresh_token', refresh_token: refreshToken})
  const result = await forwardTokenRequest(config, params)
  if (!result.ok) return context.json({error: result.error, detail: result.detail}, 400)
  return context.json(result.tokens)
})
