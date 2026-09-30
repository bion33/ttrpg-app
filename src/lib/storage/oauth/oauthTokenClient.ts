/**
 * The connection/access-token machinery shared by every OAuth cloud provider (OneDrive, Google Drive): it holds the
 * active connection (a long-lived refresh token, persisted device-locally, rotated on refresh) plus a short-lived
 * in-memory access token, refreshes through the provider's relay, and retries once on a 401. Each provider creates one
 * instance and layers only its own REST calls on top. The one pure OAuth piece — the authorize URL — lives in `pkce.ts`.
 */

/** A connection an OAuth token client can drive: any shape carrying the long-lived refresh token. */
export interface OAuthConnection {
    refreshToken: string
}

/** The provider-specific configuration for a token client: its relay refresh endpoint and the messages it surfaces. */
export interface OAuthTokenClientConfig {
    refreshEndpoint: string
    notConnectedMessage: string
    expiredMessage: string
}

/**
 * The token machinery one OAuth provider drives: adopt/read/update the active connection and run authenticated requests
 * with a valid access token (refreshing and retrying as needed).
 */
export interface OAuthTokenClient<Connection extends OAuthConnection> {
    adopt(connection: Connection | null, onChange?: (connection: Connection) => void): void

    getConnection(): Connection | null

    setConnection(connection: Connection): void

    withAccessToken(request: (token: string) => Promise<Response>): Promise<Response>
}

/**
 * Creates an OAuth token client bound to one provider's relay refresh endpoint and messages; the returned instance owns
 * the active connection and cached access token in its closure, so each provider module keeps one singleton.
 */
export function createOAuthTokenClient<Connection extends OAuthConnection>(
    config: OAuthTokenClientConfig,
): OAuthTokenClient<Connection> {
    // The currently adopted connection, or null when disconnected; hydrated from the connection store by the caller.
    let active: Connection | null = null
    // Invoked with a changed connection so the caller can persist a rotated token or other connection updates.
    let onConnectionChange: ((connection: Connection) => void) | null = null
    // The cached access token and its absolute expiry (ms epoch); dropped whenever the connection changes.
    let accessToken: { value: string; expiresAt: number } | null = null

    // Sets the in-memory connection (or clears it) and the optional change callback; drops any cached access token.
    function adopt(connection: Connection | null, onChange?: (connection: Connection) => void): void {
        active = connection
        onConnectionChange = connection ? (onChange ?? null) : null
        accessToken = null
    }

    function getConnection(): Connection | null {
        return active
    }

    // Replaces the active connection and notifies the change callback so the caller persists it (a rotated token, id, …).
    function setConnection(connection: Connection): void {
        active = connection
        onConnectionChange?.(connection)
    }

    // Refreshes the access token via the relay, updating the in-memory token and rotating the stored refresh token when
    // the provider returns a new one (OneDrive always does; Google does not, so the guard is then a harmless no-op).
    async function refreshAccessToken(): Promise<string> {
        if (!active) throw new Error(config.notConnectedMessage)
        const response = await fetch(config.refreshEndpoint, {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify({refreshToken: active.refreshToken}),
        })
        if (!response.ok) throw new Error(config.expiredMessage)
        const tokens = await response.json() as { access_token: string; refresh_token?: string; expires_in?: number }
        // Expire ~60s early so a token never lapses mid-request.
        accessToken = {value: tokens.access_token, expiresAt: Date.now() + ((tokens.expires_in ?? 3600) - 60) * 1000}
        if (tokens.refresh_token && active) setConnection({...active, refreshToken: tokens.refresh_token})
        return accessToken.value
    }

    // Runs an authenticated request with a valid access token, refreshing first if the cached one is absent or stale.
    async function withAccessToken(request: (token: string) => Promise<Response>): Promise<Response> {
        const token = accessToken && accessToken.expiresAt > Date.now() ? accessToken.value : await refreshAccessToken()
        const response = await request(token)
        // A 401 despite a fresh token means it was revoked/expired server-side; refresh once and retry.
        if (response.status === 401) return request(await refreshAccessToken())
        return response
    }

    return {adopt, getConnection, setConnection, withAccessToken}
}
