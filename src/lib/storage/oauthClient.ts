/**
 * Browser-side Microsoft OAuth glue (side-effectful, like fileProvider's picker glue): opens the sign-in popup, awaits
 * the code posted back from the static callback page, and exchanges/refreshes tokens through the server relay. The one
 * pure piece — the authorize URL — lives in `pkce.ts`.
 */
import {authorizeUrl, codeChallenge, createCodeVerifier, createState} from './pkce.ts'

// The requested delegated scope: the app's own OneDrive folder plus a refresh token and sign-in — no profile/User.Read.
const SCOPE = 'Files.ReadWrite.AppFolder offline_access openid'
// How long to wait for the popup to post its code back before giving up.
const AUTH_TIMEOUT_MS = 5 * 60 * 1000

/** The public client configuration read from Vite env vars; the client id and redirect URI are public by design. */
function clientConfig(): {clientId: string; redirectUri: string; tenant: string} {
    return {
        clientId: import.meta.env.VITE_MS_CLIENT_ID ?? '',
        redirectUri: import.meta.env.VITE_MS_REDIRECT_URI ?? `${location.origin}/oauth/microsoft/callback.html`,
        tenant: import.meta.env.VITE_MS_TENANT ?? 'common',
    }
}

// The message the callback page posts back to the opener once Microsoft redirects to it with a code.
interface CallbackMessage {
    source: 'onedrive-auth'
    code?: string
    state?: string
    error?: string
}

// True when a posted message is our callback's, from our own origin (guards against cross-origin postMessage spoofing).
function isCallbackMessage(event: MessageEvent): event is MessageEvent<CallbackMessage> {
    return event.origin === location.origin
        && typeof event.data === 'object' && event.data !== null
        && (event.data as CallbackMessage).source === 'onedrive-auth'
}

/**
 * Runs the interactive Microsoft sign-in: opens a popup to the authorize URL and resolves with the returned auth code,
 * validating the CSRF state and message origin; rejects on error, a closed popup, or timeout.
 */
export async function runMicrosoftAuth(): Promise<{code: string; verifier: string}> {
    const {clientId, redirectUri, tenant} = clientConfig()
    const verifier = createCodeVerifier()
    const state = createState()
    // Open the popup synchronously so the user gesture is not lost, then point it at the URL once the challenge is ready.
    const popup = window.open('', 'onedrive-auth', 'width=520,height=640')
    if (!popup) throw new Error('The sign-in popup was blocked. Allow popups for this site and try again.')

    try {
        const challenge = await codeChallenge(verifier)
        popup.location.href = authorizeUrl({tenant, clientId, redirectUri, scope: SCOPE, state, challenge})
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
            if (!isCallbackMessage(event)) return
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
 * Exchanges an authorization code (with its PKCE verifier) for tokens via the server relay.
 */
export async function exchangeCode(code: string, verifier: string): Promise<TokenResponse> {
    const response = await fetch('/api/oauth/microsoft/exchange', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({code, codeVerifier: verifier}),
    })
    if (!response.ok) throw new Error('Could not complete Microsoft sign-in.')
    return response.json() as Promise<TokenResponse>
}
