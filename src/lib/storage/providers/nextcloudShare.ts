/**
 * The origin and token of a Nextcloud public share, derived from its share link.
 */
export interface ShareTarget {
    origin: string
    token: string
}

// Pulls the share token out of a public-share path, matching `/s/<token>` with or without an `/index.php` prefix.
const SHARE_PATH = /^(?:\/index\.php)?\/s\/([^/?#]+)/

/**
 * Parses a Nextcloud public-share link into its origin and share token.
 */
export function parseShareUrl(raw: string): ShareTarget {
    let url: URL
    try {
        url = new URL(raw.trim())
    } catch {
        throw new Error('Not a valid Nextcloud share link.')
    }
    const match = SHARE_PATH.exec(url.pathname)
    if (!match) throw new Error('Not a valid Nextcloud share link.')
    return {origin: url.origin, token: match[1]}
}
