/**
 * Shared helper for turning a failed provider HTTP response into a diagnosable error message: a provider-specific lead
 * (with any credential/permission hint for the status) followed by the server's own response text when it carries one,
 * so a failure can be pinpointed rather than reported as an opaque status code.
 */

// The longest server message kept inline; a longer body (e.g. an HTML error page) is truncated to stay a one-line hint.
const MAX_DETAIL_LENGTH = 200

/**
 * Builds an error message for a failed response: `lead(status)` followed by the server's own response text in
 * parentheses when present. Consumes the response body, so call it only on the error path.
 */
export async function describeHttpFailure(response: Response, lead: (status: number) => string): Promise<string> {
    const detail = await readBodyText(response)
    const base = lead(response.status)
    return detail ? `${base} (${detail})` : base
}

// Reads a response body as a trimmed, whitespace-collapsed, length-capped one-liner, or null when empty/unreadable.
async function readBodyText(response: Response): Promise<string | null> {
    try {
        const oneLine = (await response.text()).replace(/\s+/g, ' ').trim()
        if (!oneLine) return null
        return oneLine.length > MAX_DETAIL_LENGTH ? `${oneLine.slice(0, MAX_DETAIL_LENGTH)}…` : oneLine
    } catch {
        return null
    }
}
