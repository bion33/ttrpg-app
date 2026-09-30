/**
 * Pure PKCE (RFC 7636) and OAuth request helpers: a high-entropy code verifier and CSRF state, the S256 code challenge,
 * and the authorize-URL builder. No side effects beyond reading `crypto` — the browser glue lives in `oauthClient.ts`.
 */

// The characters of an unreserved base64url alphabet, used to render random bytes without padding or +/ characters.
function base64UrlFromString(binary: string): string {
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Base64url-encodes raw bytes (no padding, URL-safe alphabet) — the shared encoder for verifiers and the S256 challenge.
 */
export function base64UrlEncode(bytes: Uint8Array): string {
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return base64UrlFromString(binary)
}

/**
 * Generates a high-entropy base64url code verifier (32 random bytes) for the PKCE exchange.
 */
export function createCodeVerifier(): string {
    return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)))
}

/**
 * Generates a random CSRF state token, validated on the OAuth callback against the value the request opened with.
 */
export function createState(): string {
    return base64UrlEncode(crypto.getRandomValues(new Uint8Array(16)))
}

/**
 * Computes the S256 code challenge for a verifier: the base64url-encoded SHA-256 of its ASCII bytes.
 */
export async function codeChallenge(verifier: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
    return base64UrlEncode(new Uint8Array(digest))
}

/** The parameters for a provider's authorize URL: its endpoint, the public client id, redirect URI, scope, CSRF state,
 * the S256 challenge, and any provider-specific extra query params (Microsoft's response_mode; Google's access_type). */
export interface AuthorizeUrlParams {
    authorizeEndpoint: string
    clientId: string
    redirectUri: string
    scope: string
    state: string
    challenge: string
    extraParams?: Record<string, string>
}

/**
 * Builds an OAuth authorize URL for an auth-code + PKCE flow (`response_type=code`, S256) at a provider's endpoint.
 */
export function authorizeUrl(params: AuthorizeUrlParams): string {
    const query = new URLSearchParams({
        client_id: params.clientId,
        response_type: 'code',
        redirect_uri: params.redirectUri,
        scope: params.scope,
        state: params.state,
        code_challenge: params.challenge,
        code_challenge_method: 'S256',
        ...params.extraParams,
    })
    return `${params.authorizeEndpoint}?${query.toString()}`
}
