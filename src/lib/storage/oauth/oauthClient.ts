/**
 * Browser-side OAuth glue (side-effectful, like fileProvider's picker glue): opens the sign-in popup, awaits the code
 * posted back from the static callback page, and exchanges/refreshes tokens through the server relay. Generic over
 * provider — each provider supplies its own config. The one pure piece — the authorize URL — lives in `pkce.ts`.
 */
import {authorizeUrl, codeChallenge, createCodeVerifier, createState} from './pkce.ts'

// How long to wait for the popup to post its code back before giving up.
const AUTH_TIMEOUT_MS = 5 * 60 * 1000

/** The relay providers the exchange/refresh routes are mounted for (`/api/oauth/{provider}/…`). */
export type RelayProvider = 'microsoft' | 'google'

/** One OAuth provider's browser-side configuration: relay id, authorize endpoint, public client id/redirect/scope, the
 * callback message source and popup window name, and any provider-specific authorize query params. */
export interface OAuthClientConfig {
    relayProvider: RelayProvider
    authorizeEndpoint: string
    clientId: string
    redirectUri: string
    scope: string
    messageSource: string
    windowName: string
    extraParams?: Record<string, string>
}

// The message a callback page posts back to the opener once the provider redirects to it with a code.
interface CallbackMessage {
    source: string
    code?: string
    state?: string
    error?: string
}

// True when a posted message is our callback's, from our own origin (guards against cross-origin postMessage spoofing).
function isCallbackMessage(event: MessageEvent, messageSource: string): event is MessageEvent<CallbackMessage> {
    return event.origin === location.origin
        && typeof event.data === 'object' && event.data !== null
        && (event.data as CallbackMessage).source === messageSource
}

/**
 * Runs an interactive OAuth sign-in: opens a popup to the provider's authorize URL and resolves with the returned auth
 * code, validating the CSRF state and message origin; rejects on error, a closed popup, or timeout.
 */
export async function runOAuth(config: OAuthClientConfig): Promise<{ code: string; verifier: string }> {
    const verifier = createCodeVerifier()
    const state = createState()
    // Open the popup synchronously so the user gesture is not lost, then point it at the URL once the challenge is ready.
    const popup = window.open('', config.windowName, 'width=520,height=640')
    if (!popup) throw new Error('The sign-in popup was blocked. Allow popups for this site and try again.')

    try {
        const challenge = await codeChallenge(verifier)
        popup.location.href = authorizeUrl({
            authorizeEndpoint: config.authorizeEndpoint,
            clientId: config.clientId,
            redirectUri: config.redirectUri,
            scope: config.scope,
            state,
            challenge,
            extraParams: config.extraParams,
        })
    } catch (caught) {
        popup.close()
        throw caught
    }

    const code = await new Promise<string>((resolve, reject) => {
        let settled = false
        const finish = (fn: () => void) => {
            if (settled) return
            settled = true
            window.removeEventListener('message', onMessage)
            clearInterval(closedTimer)
            clearTimeout(timeoutTimer)
            fn()
        }
        const onMessage = (event: MessageEvent) => {
            if (!isCallbackMessage(event, config.messageSource)) return
            const message = event.data
            if (message.error) return finish(() => reject(new Error(message.error)))
            if (message.state !== state) return finish(() => reject(new Error('Sign-in state mismatch.')))
            if (!message.code) return finish(() => reject(new Error('Sign-in returned no code.')))
            popup.close()
            finish(() => resolve(message.code!))
        }
        window.addEventListener('message', onMessage)
        const closedTimer = setInterval(() => {
            if (popup.closed) finish(() => reject(new Error('Sign-in was cancelled.')))
        }, 500)
        const timeoutTimer = setTimeout(() => {
            popup.close()
            finish(() => reject(new Error('Sign-in timed out.')))
        }, AUTH_TIMEOUT_MS)
    })

    return {code, verifier}
}

/** The token fields returned by the OAuth relay. */
export interface TokenResponse {
    access_token: string
    refresh_token?: string
    expires_in?: number
}

/**
 * Exchanges an authorization code (with its PKCE verifier) for tokens via the server relay for the given provider.
 */
export async function exchangeCode(provider: RelayProvider, code: string, verifier: string): Promise<TokenResponse> {
    const response = await fetch(`/api/oauth/${provider}/exchange`, {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({code, codeVerifier: verifier}),
    })
    if (!response.ok) throw new Error(await describeExchangeFailure(response))
    return response.json() as Promise<TokenResponse>
}

// Builds a diagnosable message from a failed exchange: the provider's own error (unwrapped from the relay's `detail`)
// when there is one, or a hint that the server is missing this provider's OAuth configuration on a 500/404.
async function describeExchangeFailure(response: Response): Promise<string> {
    if (response.status === 500 || response.status === 404) {
        return 'Sign-in failed: the storage server is missing this provider\'s OAuth configuration.'
    }
    const detail = await readErrorDetail(response)
    return detail ? `Could not complete sign-in: ${detail}` : 'Could not complete sign-in.'
}

// Best-effort extraction of the provider's own error message from the relay's {error, detail} body; the token endpoint's
// `detail` is usually itself JSON ({error, error_description}), so unwrap that when present.
async function readErrorDetail(response: Response): Promise<string | null> {
    try {
        const body = await response.json() as { error?: string; detail?: string }
        const detail = body.detail ?? body.error
        if (!detail) return null
        try {
            const parsed = JSON.parse(detail) as { error_description?: string; error?: string }
            return parsed.error_description ?? parsed.error ?? detail
        } catch {
            return detail
        }
    } catch {
        return null
    }
}

/** The Microsoft (OneDrive) client config; the tenant folds into the authorize endpoint. */
function microsoftConfig(): OAuthClientConfig {
    const tenant = import.meta.env.VITE_MS_TENANT ?? 'common'
    return {
        relayProvider: 'microsoft',
        authorizeEndpoint: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
        clientId: import.meta.env.VITE_MS_CLIENT_ID ?? '',
        redirectUri: import.meta.env.VITE_MS_REDIRECT_URI ?? `${location.origin}/oauth/microsoft/callback.html`,
        scope: 'Files.ReadWrite.AppFolder offline_access openid',
        messageSource: 'onedrive-auth',
        windowName: 'onedrive-auth',
        extraParams: {response_mode: 'query'},
    }
}

/** The Google (Drive app-data) client config; access_type=offline + prompt=consent guarantee a refresh token. */
function googleConfig(): OAuthClientConfig {
    return {
        relayProvider: 'google',
        authorizeEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
        redirectUri: import.meta.env.VITE_GOOGLE_REDIRECT_URI ?? `${location.origin}/oauth/google/callback.html`,
        scope: 'https://www.googleapis.com/auth/drive.appdata',
        messageSource: 'googledrive-auth',
        windowName: 'googledrive-auth',
        extraParams: {access_type: 'offline', prompt: 'consent'},
    }
}

/** Runs the interactive Microsoft sign-in and resolves with the returned auth code and PKCE verifier. */
export const runMicrosoftAuth = () => runOAuth(microsoftConfig())

/** Runs the interactive Google sign-in and resolves with the returned auth code and PKCE verifier. */
export const runGoogleAuth = () => runOAuth(googleConfig())
