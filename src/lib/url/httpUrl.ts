/**
 * Whether a string is a well-formed absolute http(s) URL — the only addresses accepted for an inserted image.
 */
export function isHttpUrl(value: string): boolean {
    let parsed: URL
    try {
        parsed = new URL(value)
    } catch {
        return false
    }
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
}
